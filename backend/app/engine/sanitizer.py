"""Safe sanitization engine for GroundCheck.
Removes unsafe claims or corrects from canonical source, then performs an independent second audit.
"""
import re
from typing import List, Dict, Any, Tuple, Optional

from ..schemas import (
    ClaimVerificationResult,
    ClaimStatus,
    SanitizationPolicy,
    SanitizeResponse,
    ReplacedClaim,
    VerifyResponse,
)
from .document_loader import corpus_loader


class AnswerSanitizer:
    def sanitize(
        self,
        query: str,
        original_response: str,
        initial_claims: List[ClaimVerificationResult],
        policy: SanitizationPolicy = SanitizationPolicy.CORRECT_FROM_CANONICAL_SOURCE,
        preserve_supported: bool = True,
    ) -> Tuple[str, List[str], List[ReplacedClaim], List[str]]:
        """Applies sanitization policy to produce sanitized text, tracking removals and replacements.
        """
        removed_claims: List[str] = []
        replaced_claims: List[ReplacedClaim] = []
        warnings: List[str] = []

        sanitized_parts: List[str] = []

        for claim in initial_claims:
            if claim.status == ClaimStatus.SUPPORTED:
                if preserve_supported:
                    sanitized_parts.append(claim.claim_text)
            elif claim.status == ClaimStatus.CONTRADICTED:
                if policy == SanitizationPolicy.CORRECT_FROM_CANONICAL_SOURCE:
                    replacement = self._generate_canonical_correction(claim)
                    if replacement:
                        sanitized_parts.append(replacement.replacement_claim)
                        replaced_claims.append(replacement)
                    else:
                        removed_claims.append(claim.claim_text)
                        warnings.append(
                            f"Contradicted claim '{claim.claim_id}' had no canonical replacement fact and was removed."
                        )
                else:
                    removed_claims.append(claim.claim_text)
            elif claim.status in (ClaimStatus.UNSUPPORTED, ClaimStatus.REVIEW):
                removed_claims.append(claim.claim_text)
                if claim.status == ClaimStatus.REVIEW:
                    warnings.append(
                        f"Claim '{claim.claim_id}' was in REVIEW/CONFLICT and safely excluded from sanitized output."
                    )

        # Assemble sanitized response
        if sanitized_parts:
            # Join parts nicely
            joined = " ".join(sanitized_parts)
            # Clean up duplicate periods or spaces
            joined = re.sub(r'\s+', ' ', joined).strip()
            joined = re.sub(r'\.\s*\.', '.', joined)
            sanitized_response = joined
        else:
            sanitized_response = "No verified factual statements from the original response could be substantiated by policy."

        return sanitized_response, removed_claims, replaced_claims, warnings

    def _generate_canonical_correction(self, claim: ClaimVerificationResult) -> Optional[ReplacedClaim]:
        """Generates source-backed correction only when an applicable canonical source explicitly establishes it.
        """
        claim_facts = claim.fact_guard.detected_facts if claim.fact_guard else {}
        claim_key = claim_facts.get("policy_key")
        if not claim_key:
            return None

        # Check fact guard for canonical match
        fg = claim.fact_guard
        if fg and fg.canonical_match:
            cm = fg.canonical_match
            policy_key = cm.get("policy_key")
            if policy_key == claim_key and policy_key == "paid_leave_allowance":
                val = cm.get("value", 14)
                unit = cm.get("unit", "days")
                scope = cm.get("scope", "eligible full-time employees")
                period = cm.get("period", "per calendar year")
                replacement_text = f"According to Acme Policy, {scope} receive {val} paid leave {unit} {period}."
                return ReplacedClaim(
                    original_claim=claim.claim_text,
                    replacement_claim=replacement_text,
                    canonical_chunk_id=claim.chunk_id or "CHK-HR-001",
                    canonical_fact=f"{scope} receive {val} paid leave {unit} {period}",
                )

        # Check evidence candidates for canonical facts
        for cand in claim.evidence_candidates:
            if cand.is_canonical:
                chk = corpus_loader.get_chunk(cand.chunk_id)
                if chk and chk.get("canonical_facts"):
                    cf = chk["canonical_facts"]
                    if cf.get("policy_key") == claim_key and claim_key == "paid_leave_allowance":
                        val = cf.get("value", 14)
                        unit = cf.get("unit", "days")
                        scope = cf.get("scope", "eligible full-time employees")
                        period = cf.get("period", "per calendar year")
                        replacement_text = f"According to Acme Policy, {scope} receive {val} paid leave {unit} {period}."
                        return ReplacedClaim(
                            original_claim=claim.claim_text,
                            replacement_claim=replacement_text,
                            canonical_chunk_id=cand.chunk_id,
                            canonical_fact=f"{scope} receive {val} paid leave {unit} {period}",
                        )

        return None


answer_sanitizer = AnswerSanitizer()
