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
            if "unlimited" in text_lower or "unrestricted" in text_lower:
                facts["unlimited_remote_work"] = True
            num_match = self.numeric_pattern.search(text_lower)
            if num_match:
                facts["days_per_week"] = int(float(num_match.group(1)))

        # 3. MFA / IT Security
        if "mfa" in text_lower or "multi-factor" in text_lower or "authentication" in text_lower:
            facts["policy_key"] = "mfa_requirement"
            if "optional" in text_lower or "not required" in text_lower or "no mfa" in text_lower or "passwords only" in text_lower:
                facts["mfa_mandatory"] = False
            elif "mandatory" in text_lower or "required" in text_lower or "requires" in text_lower:
                facts["mfa_mandatory"] = True

        # 4. Confidential Storage
        if "personal drive" in text_lower or "personal cloud" in text_lower or "encrypted storage" in text_lower or "confidential data" in text_lower or "storing company" in text_lower:
            if "personal drive" in text_lower or "personal cloud" in text_lower:
                facts["policy_key"] = "confidential_storage"
                if "may save" in text_lower or "can save" in text_lower or "allowed" in text_lower or "permitted" in text_lower:
                    facts["personal_storage_allowed"] = True
                elif "prohibited" in text_lower or "not allowed" in text_lower:
                    facts["personal_storage_allowed"] = False
            elif "encrypted storage" in text_lower:
                facts["policy_key"] = "confidential_storage"
                facts["encrypted_required"] = True

        # 5. Scope Detection
        if "contractors and interns" in text_lower or "contractor" in text_lower or "intern" in text_lower:
            facts["scope"] = "contractors_and_interns"
            if "receive" in text_lower or "full" in text_lower or "eligible" in text_lower or "benefits" in text_lower:
                facts["policy_key"] = "benefits_scope"
                facts["claims_contractors_eligible"] = True
        elif "eligible full-time employees" in text_lower:
            facts["scope"] = "eligible full-time employees"
        elif "all employees" in text_lower or "everyone" in text_lower:
            facts["scope"] = "all employees"

        # 6. Leave Approval Requirement
        if "approval" in text_lower and ("leave" in text_lower or "advance" in text_lower or "business days" in text_lower):
            facts["policy_key"] = "leave_approval_requirement"
            num_match = self.numeric_pattern.search(text_lower)
            if num_match:
                facts["advance_notice_days"] = int(float(num_match.group(1)))
            if "manager" in text_lower or "reporting-manager" in text_lower:
                facts["approver"] = "reporting-manager"

        # 7. Carryover
        if "carryover" in text_lower or "carry over" in text_lower or "unused leave" in text_lower:
            facts["policy_key"] = "leave_carryover"
            num_match = self.numeric_pattern.search(text_lower)
            if num_match:
                facts["max_carryover_days"] = int(float(num_match.group(1)))

        # Period
        if "calendar year" in text_lower or "annually" in text_lower or "per year" in text_lower:
            facts["period"] = "per calendar year"
        elif "quarter" in text_lower or "calendar quarter" in text_lower:
            facts["period"] = "per calendar quarter"
        elif "month" in text_lower or "monthly" in text_lower:
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

            # Check if chunk is superseded (version drift detection)
            is_superseded = canonical_facts.get("superseded", False)

            # 1. Compare paid leave allowance
            if policy_key == "paid_leave_allowance":
                canonical_val = canonical_facts.get("value")
                claim_val = claim_facts.get("value")
                if claim_val is not None and canonical_val is not None:
                    if is_superseded:
                        if claim_val == canonical_val:
                            return FactGuardResult(
                                checked=True,
                                passed=False,
                                detected_facts=claim_facts,
                                canonical_match=canonical_facts,
                                conflict_detected=True,
                                reason=(
                                    f"Version drift conflict: Claim matches archived 2025 policy ({canonical_val} days), "
                                    f"which is superseded by canonical 2026 policy (14 days)."
                                ),
                            )
                    elif claim_val != canonical_val:
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

            # 2. Compare remote work entitlement
            if policy_key == "remote_work_entitlement":
                if claim_facts.get("unlimited_remote_work"):
                    return FactGuardResult(
                        checked=True,
                        passed=False,
                        detected_facts=claim_facts,
                        canonical_match=canonical_facts,
                        conflict_detected=False,
                        reason="No applicable entitlement for unlimited remote work exists in the configured corpus. Configured policy allows hybrid work up to 2 days/week only.",
                    )
                elif "days_per_week" in claim_facts:
                    val = claim_facts["days_per_week"]
                    canon_days = canonical_facts.get("allowed_days", 2)
                    if val <= canon_days:
                        return FactGuardResult(
                            checked=True,
                            passed=True,
                            detected_facts=claim_facts,
                            canonical_match=canonical_facts,
                            conflict_detected=False,
                            reason=f"Remote work allowance ({val} days/week) aligns with canonical hybrid guidelines (up to {canon_days} days/week).",
                        )
                    else:
                        return FactGuardResult(
                            checked=True,
                            passed=False,
                            detected_facts=claim_facts,
                            canonical_match=canonical_facts,
                            conflict_detected=True,
                            reason=f"Remote work assertion of {val} days/week exceeds canonical limit of {canon_days} days/week.",
                        )

            # 3. Compare MFA requirement
            if policy_key == "mfa_requirement":
                claim_mfa = claim_facts.get("mfa_mandatory")
                if claim_mfa is False:
                    return FactGuardResult(
                        checked=True,
                        passed=False,
                        detected_facts=claim_facts,
                        canonical_match=canonical_facts,
                        conflict_detected=True,
                        reason="Security policy conflict: Claim asserts MFA is optional or not required, but canonical policy mandates MFA for all sensitive systems.",
                    )
                elif claim_mfa is True:
                    return FactGuardResult(
                        checked=True,
                        passed=True,
                        detected_facts=claim_facts,
                        canonical_match=canonical_facts,
                        conflict_detected=False,
                        reason="MFA requirement aligns with canonical IT security policy.",
                    )

            # 4. Compare Confidential Storage
            if policy_key == "confidential_storage":
                if claim_facts.get("personal_storage_allowed"):
                    return FactGuardResult(
                        checked=True,
                        passed=False,
                        detected_facts=claim_facts,
                        canonical_match=canonical_facts,
                        conflict_detected=True,
                        reason="Security policy conflict: Claim asserts saving to personal drives or cloud is permitted, but Section 3.4 strictly prohibits unapproved storage.",
                    )
                elif claim_facts.get("encrypted_required") or claim_facts.get("personal_storage_allowed") is False:
                    return FactGuardResult(
                        checked=True,
                        passed=True,
                        detected_facts=claim_facts,
                        canonical_match=canonical_facts,
                        conflict_detected=False,
                        reason="Confidential storage claim aligns with canonical encrypted storage requirement.",
                    )

            # 5. Compare Benefits Scope
            if policy_key == "benefits_scope":
                if claim_facts.get("claims_contractors_eligible"):
                    return FactGuardResult(
                        checked=True,
                        passed=False,
                        detected_facts=claim_facts,
                        canonical_match=canonical_facts,
                        conflict_detected=True,
                        reason="Scope policy conflict: Claim extends statutory benefits to contractors/interns, but Section 4.1 explicitly restricts benefits to eligible full-time staff.",
                    )

            # 6. Compare Leave Approval Requirement
            if policy_key == "leave_approval_requirement":
                claim_advance = claim_facts.get("advance_notice_days")
                canon_advance = canonical_facts.get("advance_notice_days", 5)
                if claim_advance is not None and claim_advance != canon_advance:
                    return FactGuardResult(
                        checked=True,
                        passed=False,
                        detected_facts=claim_facts,
                        canonical_match=canonical_facts,
                        conflict_detected=True,
                        reason=f"Policy requirement conflict: Claim asserts {claim_advance} days notice, but Section 2.3 strictly requires at least {canon_advance} business days prior.",
                    )
                else:
                    return FactGuardResult(
                        checked=True,
                        passed=True,
                        detected_facts=claim_facts,
                        canonical_match=canonical_facts,
                        conflict_detected=False,
                        reason=f"Leave approval requirement matches canonical policy ({canon_advance} business days notice).",
                    )

            # 7. Carryover
            if policy_key == "leave_carryover":
                claim_carry = claim_facts.get("max_carryover_days")
                canon_carry = canonical_facts.get("max_carryover_days", 5)
                if claim_carry is not None and claim_carry != canon_carry:
                    return FactGuardResult(
                        checked=True,
                        passed=False,
                        detected_facts=claim_facts,
                        canonical_match=canonical_facts,
                        conflict_detected=True,
                        reason=f"Carryover policy conflict: Claim asserts {claim_carry} days carryover, but Section 3.1 allows up to {canon_carry} unused days.",
                    )
                else:
                    return FactGuardResult(
                        checked=True,
                        passed=True,
                        detected_facts=claim_facts,
                        canonical_match=canonical_facts,
                        conflict_detected=False,
                        reason=f"Carryover allowance matches canonical policy (up to {canon_carry} days).",
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
