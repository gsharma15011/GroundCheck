"""Claim Mutation Lab engine for GroundCheck.
Generates controlled variants (numeric, negation, scope, period, qualifier) and evaluates
verifier robustness against source-grounded expectations.
"""
import re
import time
import uuid
from typing import List, Dict, Any, Optional, Tuple

from ..schemas import (
    ClaimVerificationResult,
    MutationCaseResult,
    MutationOutcome,
    MutationSuiteResponse,
    ClaimStatus,
)
from .retrieval import hybrid_retriever
from .nli_verifier import nli_verifier


class MutationGenerator:
    def generate_and_evaluate(
        self,
        claims: List[ClaimVerificationResult],
        mutation_families: Optional[List[str]] = None,
        max_cases: int = 20,
        demo_mode: bool = False,
    ) -> MutationSuiteResponse:
        start_time = time.time()
        suite_id = f"MTS-{uuid.uuid4().hex[:8]}"

        selected_families = mutation_families or [
            "numeric_swap",
            "negation_flip",
            "scope_shift",
            "date_period_shift",
            "qualifier_change",
        ]

        cases: List[MutationCaseResult] = []
        test_counter = 1

        for claim in claims:
            if len(cases) >= max_cases:
                break

            for family in selected_families:
                if len(cases) >= max_cases:
                    break

                case_result = self._generate_case(
                    test_id=f"MUT-{test_counter:03d}",
                    claim=claim,
                    family=family,
                    demo_mode=demo_mode,
                )
                if case_result:
                    cases.append(case_result)
                    test_counter += 1

        # Calculate statistics
        passed = sum(1 for c in cases if c.pass_fail_abstain == MutationOutcome.PASS)
        failed = sum(1 for c in cases if c.pass_fail_abstain == MutationOutcome.FAIL)
        abstained = sum(1 for c in cases if c.pass_fail_abstain == MutationOutcome.ABSTAIN)
        skipped = sum(1 for c in cases if c.pass_fail_abstain == MutationOutcome.SKIPPED)

        evaluated_count = passed + failed + abstained
        
        # Robustness score = correctly flagged / evaluated_count (null if evaluated_count == 0)
        robustness_score = (
            round((passed / evaluated_count) * 100.0, 2)
            if evaluated_count > 0
            else None
        )

        total_generated = evaluated_count + skipped
        coverage = round(evaluated_count / total_generated, 4) if total_generated > 0 else 0.0
        elapsed_ms = round((time.time() - start_time) * 1000, 2)

        mode_str = "DEMO" if demo_mode else ("LIVE" if nli_verifier.is_ready else "DEGRADED")

        return MutationSuiteResponse(
            suite_id=suite_id,
            cases=cases,
            passed=passed,
            failed=failed,
            abstained=abstained,
            skipped=skipped,
            evaluated_count=evaluated_count,
            robustness_score=robustness_score,
            coverage=coverage,
            mode=mode_str,
            processing_time_ms=elapsed_ms,
        )

    def _generate_case(
        self,
        test_id: str,
        claim: ClaimVerificationResult,
        family: str,
        demo_mode: bool,
    ) -> Optional[MutationCaseResult]:
        t0 = time.time()
        orig_text = claim.claim_text

        mutated_text = None
        expected_status = None
        explanation = ""
        evidence_ids = [claim.chunk_id] if claim.chunk_id else []

        # 1. Numeric Swap Family
        if family == "numeric_swap":
            # Match numbers like 14 or 20
            match = re.search(r'\b(\d+)\b', orig_text)
            if match:
                curr_val = int(match.group(1))
                # If current is 14 -> swap to 20 (expected CONTRADICTED)
                # If current is 20 -> swap to 14 (expected SUPPORTED)
                if curr_val == 14:
                    new_val = 20
                    mutated_text = orig_text[:match.start()] + str(new_val) + orig_text[match.end():]
                    expected_status = "CONTRADICTED"
                    explanation = "Mutated leave days from 14 to 20; canonical source strictly specifies 14 days."
                elif curr_val == 20:
                    new_val = 14
                    mutated_text = orig_text[:match.start()] + str(new_val) + orig_text[match.end():]
                    expected_status = "SUPPORTED"
                    explanation = "Mutated leave days from 20 to 14; aligns directly with canonical 14-day policy."
                else:
                    new_val = curr_val + 5
                    mutated_text = orig_text[:match.start()] + str(new_val) + orig_text[match.end():]
                    expected_status = "CONTRADICTED"
                    explanation = f"Altered numeric quantity from {curr_val} to {new_val}."
            else:
                return MutationCaseResult(
                    test_id=test_id,
                    source_claim_id=claim.claim_id,
                    mutation_family=family,
                    original_text=orig_text,
                    mutated_text="[No numeric token found]",
                    expected_status="N/A",
                    actual_status="SKIPPED",
                    pass_fail_abstain=MutationOutcome.SKIPPED,
                    evidence_ids=[],
                    explanation="Claim contains no numeric token eligible for numeric mutation.",
                    model_mode="DETERMINISTIC",
                    duration_ms=0.1,
                )

        # 2. Negation Flip Family
        elif family == "negation_flip":
            if re.search(r'\b(do not|does not|cannot|never|not)\b', orig_text, re.IGNORECASE):
                # Remove negation
                mutated_text = re.sub(r'\b(do not|does not|cannot|never|not)\s*', '', orig_text, flags=re.IGNORECASE)
                expected_status = "SUPPORTED" if claim.status == ClaimStatus.CONTRADICTED else "CONTRADICTED"
                explanation = "Inverted negative polarity to affirmative."
            elif re.search(r'\b(receive|receives|get|gets)\b', orig_text, re.IGNORECASE):
                mutated_text = re.sub(
                    r'\b(receive|receives|get|gets)\b',
                    'do not receive',
                    orig_text,
                    count=1,
                    flags=re.IGNORECASE,
                )
                expected_status = "CONTRADICTED"
                explanation = "Inverted affirmative entitlement into negation ('do not receive'). Canonical source grants entitlement."
            elif re.search(r'\brequire\b', orig_text, re.IGNORECASE):
                mutated_text = re.sub(r'\brequire\b', 'do not require', orig_text, count=1, flags=re.IGNORECASE)
                expected_status = "CONTRADICTED"
                explanation = "Inverted requirement statement into negation."
            else:
                return MutationCaseResult(
                    test_id=test_id,
                    source_claim_id=claim.claim_id,
                    mutation_family=family,
                    original_text=orig_text,
                    mutated_text="[No verb eligible for polarity flip]",
                    expected_status="N/A",
                    actual_status="SKIPPED",
                    pass_fail_abstain=MutationOutcome.SKIPPED,
                    evidence_ids=[],
                    explanation="No suitable affirmative/negative verb anchor found to invert polarity safely.",
                    model_mode="DETERMINISTIC",
                    duration_ms=0.1,
                )

        # 3. Scope Shift Family
        elif family == "scope_shift":
            if "eligible full-time employees" in orig_text.lower():
                mutated_text = re.sub(
                    r'eligible full-time employees',
                    'all employees, contractors, and temporary interns',
                    orig_text,
                    flags=re.IGNORECASE,
                )
                expected_status = "CONTRADICTED"
                explanation = "Broadened scope from full-time employees to all contractors and interns. Section 4.1 explicitly excludes contractors/interns."
            elif "employees" in orig_text.lower():
                mutated_text = re.sub(
                    r'\bemployees\b',
                    'all contract workers and external interns',
                    orig_text,
                    flags=re.IGNORECASE,
                )
                expected_status = "UNSUPPORTED"
                explanation = "Shifted eligibility scope to contract workers. No such entitlement exists for contractors."
            else:
                return MutationCaseResult(
                    test_id=test_id,
                    source_claim_id=claim.claim_id,
                    mutation_family=family,
                    original_text=orig_text,
                    mutated_text="[No scope token eligible]",
                    expected_status="N/A",
                    actual_status="SKIPPED",
                    pass_fail_abstain=MutationOutcome.SKIPPED,
                    evidence_ids=[],
                    explanation="No explicit employee or organizational scope identifier found in claim.",
                    model_mode="DETERMINISTIC",
                    duration_ms=0.1,
                )

        # 4. Date / Period Shift Family
        elif family == "date_period_shift":
            if "calendar year" in orig_text.lower() or "per calendar year" in orig_text.lower():
                mutated_text = re.sub(
                    r'per calendar year|calendar year',
                    'per calendar quarter',
                    orig_text,
                    flags=re.IGNORECASE,
                )
                expected_status = "CONTRADICTED"
                explanation = "Shifted policy accrual period from calendar year to calendar quarter."
            elif "annual" in orig_text.lower():
                mutated_text = re.sub(r'annual', 'monthly', orig_text, flags=re.IGNORECASE)
                expected_status = "CONTRADICTED"
                explanation = "Shifted annual cadence to monthly."
            else:
                return MutationCaseResult(
                    test_id=test_id,
                    source_claim_id=claim.claim_id,
                    mutation_family=family,
                    original_text=orig_text,
                    mutated_text="[No temporal period token]",
                    expected_status="N/A",
                    actual_status="SKIPPED",
                    pass_fail_abstain=MutationOutcome.SKIPPED,
                    evidence_ids=[],
                    explanation="No calendar period or frequency term found in claim.",
                    model_mode="DETERMINISTIC",
                    duration_ms=0.1,
                )

        # 5. Qualifier Change Family
        elif family == "qualifier_change":
            if "require" in orig_text.lower() or "requires" in orig_text.lower():
                mutated_text = re.sub(
                    r'\b(require|requires)\b',
                    'optionally suggest',
                    orig_text,
                    flags=re.IGNORECASE,
                )
                expected_status = "CONTRADICTED"
                explanation = "Weakened mandatory requirement to optional recommendation."
            elif "unlimited" in orig_text.lower():
                mutated_text = re.sub(r'unlimited', 'up to 2 scheduled days of', orig_text, flags=re.IGNORECASE)
                expected_status = "SUPPORTED"
                explanation = "Aligned qualifier with hybrid policy allowance (up to 2 scheduled days/week)."
            elif "must" in orig_text.lower():
                mutated_text = re.sub(r'\bmust\b', 'may optionally', orig_text, flags=re.IGNORECASE)
                expected_status = "CONTRADICTED"
                explanation = "Replaced mandatory obligation 'must' with permissive 'may optionally'."
            else:
                return MutationCaseResult(
                    test_id=test_id,
                    source_claim_id=claim.claim_id,
                    mutation_family=family,
                    original_text=orig_text,
                    mutated_text="[No modal qualifier eligible]",
                    expected_status="N/A",
                    actual_status="SKIPPED",
                    pass_fail_abstain=MutationOutcome.SKIPPED,
                    evidence_ids=[],
                    explanation="No modal qualifier ('must', 'requires', 'unlimited') present to mutate.",
                    model_mode="DETERMINISTIC",
                    duration_ms=0.1,
                )

        if not mutated_text:
            return None

        # Execute verifier on mutated claim
        candidates = hybrid_retriever.retrieve(mutated_text, top_k=3)
        actual_verification = nli_verifier.verify_claim(
            claim_id=f"{test_id}-V",
            claim_text=mutated_text,
            candidates=candidates,
            demo_mode=demo_mode,
        )

        actual_status = actual_verification.status.value
        if actual_verification.chunk_id:
            evidence_ids.append(actual_verification.chunk_id)

        # Pass / Fail determination
        if actual_status == expected_status:
            outcome = MutationOutcome.PASS
        elif actual_status == "REVIEW":
            outcome = MutationOutcome.ABSTAIN
        else:
            outcome = MutationOutcome.FAIL

        duration_ms = round((time.time() - t0) * 1000, 2)
        model_mode_str = "DEMO" if demo_mode else ("LIVE" if nli_verifier.is_ready else "DEGRADED")

        return MutationCaseResult(
            test_id=test_id,
            source_claim_id=claim.claim_id,
            mutation_family=family,
            original_text=orig_text,
            mutated_text=mutated_text,
            expected_status=expected_status,
            actual_status=actual_status,
            pass_fail_abstain=outcome,
            evidence_ids=list(set(evidence_ids)),
            explanation=explanation,
            model_mode=model_mode_str,
            duration_ms=duration_ms,
        )


mutation_generator = MutationGenerator()
