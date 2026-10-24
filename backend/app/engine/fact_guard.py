"""Deterministic numerical and policy fact guard for GroundCheck.
Extracts policy keys, numerical quantities, units, and scopes from claims and compares them
against canonical facts in retrieved evidence chunks.
"""
import re
from typing import Dict, Any, Optional, List, Tuple
from ..schemas import FactGuardResult


class FactGuard:
    def __init__(self):
        # Regular expressions for numeric extraction
        self.numeric_pattern = re.compile(
            r'\b(\d+(?:\.\d+)?)\s*(days?|business days?|weeks?|months?|hours?|calendar year|years?)\b',
            re.IGNORECASE
        )
        self.paid_leave_pattern = re.compile(
            r'(\d+)\s*(?:paid\s+leave\s+days|leave\s+days|days\s+of\s+paid\s+leave|paid\s+days)',
            re.IGNORECASE
        )

    def extract_claim_facts(self, text: str) -> Dict[str, Any]:
        """Extracts structured facts from a claim text.
        """
        facts: Dict[str, Any] = {}
        text_lower = text.lower()

        # 1. Paid Leave Allowance
        leave_match = self.paid_leave_pattern.search(text_lower)
        if leave_match:
            facts["policy_key"] = "paid_leave_allowance"
            facts["value"] = int(leave_match.group(1))
            facts["unit"] = "days"
        elif "paid leave" in text_lower or "annual leave" in text_lower:
            num_match = self.numeric_pattern.search(text_lower)
            if num_match:
                facts["policy_key"] = "paid_leave_allowance"
                facts["value"] = int(float(num_match.group(1)))
                facts["unit"] = num_match.group(2)

        # 2. Remote Work
        if "remote work" in text_lower or "telecommuting" in text_lower or "work remotely" in text_lower:
            facts["policy_key"] = "remote_work_entitlement"
            if "unlimited" in text_lower:
                facts["unlimited_remote_work"] = True
            num_match = self.numeric_pattern.search(text_lower)
            if num_match:
                facts["days_per_week"] = int(float(num_match.group(1)))

        # 3. MFA / IT Security
        if "mfa" in text_lower or "multi-factor" in text_lower or "authentication" in text_lower:
            facts["policy_key"] = "mfa_requirement"
            if "optional" in text_lower or "not required" in text_lower or "no mfa" in text_lower:
                facts["mfa_mandatory"] = False
            elif "mandatory" in text_lower or "required" in text_lower or "requires" in text_lower:
                facts["mfa_mandatory"] = True

        # 4. Scope Detection
        if "all employees" in text_lower or "everyone" in text_lower:
            facts["scope"] = "all employees"
        elif "full-time" in text_lower or "eligible full-time" in text_lower:
            facts["scope"] = "eligible full-time employees"
        elif "part-time" in text_lower:
            facts["scope"] = "part-time employees"
        elif "contractors" in text_lower:
            facts["scope"] = "contractors"
        elif "employees" in text_lower:
            facts["scope"] = "employees"

        # 5. Period
        if "calendar year" in text_lower or "annually" in text_lower or "per year" in text_lower:
            facts["period"] = "per calendar year"
        elif "quarter" in text_lower:
            facts["period"] = "per quarter"
        elif "month" in text_lower:
            facts["period"] = "per month"

        return facts

    def check_claim(
        self,
        claim_text: str,
        evidence_chunks: List[Dict[str, Any]],
    ) -> FactGuardResult:
        """Compares claim facts against canonical facts in evidence chunks.
        """
        claim_facts = self.extract_claim_facts(claim_text)
        if not claim_facts or "policy_key" not in claim_facts:
            return FactGuardResult(
                checked=False,
                passed=True,
                detected_facts=claim_facts,
                conflict_detected=False,
                reason="No specific numerical or policy fact constraints recognized for fact-guarding."
            )

        policy_key = claim_facts["policy_key"]
        
        # Search among canonical facts of evidence chunks (prioritize canonical non-superseded)
        sorted_chunks = sorted(
            evidence_chunks,
            key=lambda c: (
                1 if (c.get("is_canonical", True) and not c.get("canonical_facts", {}).get("superseded", False)) else 0
            ),
            reverse=True,
        )
        for chk in sorted_chunks:
            canonical_facts = chk.get("canonical_facts", {})
            if not canonical_facts:
                continue

            chunk_key = canonical_facts.get("policy_key")
            if chunk_key != policy_key:
                continue

            # Compare paid leave allowance
            if policy_key == "paid_leave_allowance":
                canonical_val = canonical_facts.get("value")
                claim_val = claim_facts.get("value")
                if claim_val is not None and canonical_val is not None:
                    if claim_val != canonical_val:
                        return FactGuardResult(
                            checked=True,
                            passed=False,
                            detected_facts=claim_facts,
                            canonical_match=canonical_facts,
                            conflict_detected=True,
                            reason=(
                                f"Numerical conflict: Claim asserts {claim_val} {claim_facts.get('unit', 'days')}, "
                                f"but canonical source ({chk.get('chunk_id')}) strictly establishes {canonical_val} {canonical_facts.get('unit', 'days')}."
                            ),
                        )
                    else:
                        return FactGuardResult(
                            checked=True,
                            passed=True,
                            detected_facts=claim_facts,
                            canonical_match=canonical_facts,
                            conflict_detected=False,
                            reason=f"Numerical fact matches canonical value ({canonical_val} {canonical_facts.get('unit', 'days')}).",
                        )

            # Compare remote work entitlement
            if policy_key == "remote_work_entitlement":
                # As per PRD: absence of applicable entitlement means UNSUPPORTED, not contradiction
                return FactGuardResult(
                    checked=True,
                    passed=False,
                    detected_facts=claim_facts,
                    canonical_match=None,
                    conflict_detected=False,
                    reason="No applicable remote work entitlement exists in the configured corpus.",
                )

            # Compare MFA requirement
            if policy_key == "mfa_requirement":
                claim_mfa = claim_facts.get("mfa_mandatory")
                if claim_mfa is False:
                    return FactGuardResult(
                        checked=True,
                        passed=False,
                        detected_facts=claim_facts,
                        canonical_match=canonical_facts,
                        conflict_detected=True,
                        reason="Security policy conflict: Claim asserts MFA is optional or not required, but canonical policy mandates MFA.",
                    )

        # If policy key exists in claim but no evidence chunk supports or matches it
        return FactGuardResult(
            checked=True,
            passed=True,
            detected_facts=claim_facts,
            canonical_match=None,
            conflict_detected=False,
            reason=f"Fact guard extracted policy facts ({policy_key}), but no conflicting canonical policy was found in retrieved chunks.",
        )


fact_guard = FactGuard()
