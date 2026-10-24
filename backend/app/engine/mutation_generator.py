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
    FamilyMetric,
    ClaimStatus,
)
from .retrieval import hybrid_retriever
from .nli_verifier import nli_verifier
from .document_loader import corpus_loader
from .fact_guard import fact_guard


class MutationGenerator:
    def generate_and_evaluate(
        self,
        claims: List[ClaimVerificationResult],
        mutation_families: Optional[List[str]] = None,
        max_cases: int = 20,
        demo_mode: bool = False,
        corpus_id: Optional[str] = "acme_corporate_policies",
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
                    corpus_id=corpus_id,
                )
                if case_result:
                    cases.append(case_result)
                    test_counter += 1

        # Calculate statistics
        passed = sum(1 for c in cases if c.pass_fail_abstain == MutationOutcome.PASS)
        failed = sum(1 for c in cases if c.pass_fail_abstain == MutationOutcome.FAIL)
        abstained = sum(1 for c in cases if c.pass_fail_abstain == MutationOutcome.ABSTAIN)
        skipped = sum(1 for c in cases if c.pass_fail_abstain == MutationOutcome.SKIPPED)

        # Evaluated denominator counts ONLY eligible cases (excludes skipped)
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

        # Family breakdown
        family_breakdown: Dict[str, FamilyMetric] = {}
        for fam in selected_families:
            fam_cases = [c for c in cases if c.mutation_family == fam]
            f_tot = len(fam_cases)
            f_p = sum(1 for c in fam_cases if c.pass_fail_abstain == MutationOutcome.PASS)
            f_f = sum(1 for c in fam_cases if c.pass_fail_abstain == MutationOutcome.FAIL)
            f_a = sum(1 for c in fam_cases if c.pass_fail_abstain == MutationOutcome.ABSTAIN)
            f_s = sum(1 for c in fam_cases if c.pass_fail_abstain == MutationOutcome.SKIPPED)
            f_eval = f_p + f_f + f_a
            f_rate = round((f_p / f_eval) * 100.0, 2) if f_eval > 0 else None
            family_breakdown[fam] = FamilyMetric(
                total_cases=f_tot,
                evaluated_cases=f_eval,
                passed_cases=f_p,
                failed_cases=f_f,
                abstained_cases=f_a,
                skipped_cases=f_s,
                pass_rate=f_rate,
            )

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
            family_breakdown=family_breakdown,
            mode=mode_str,
            processing_time_ms=elapsed_ms,
        )

    def _generate_case(
        self,
        test_id: str,
        claim: ClaimVerificationResult,
        family: str,
        demo_mode: bool,
        corpus_id: Optional[str] = "acme_corporate_policies",
    ) -> Optional[MutationCaseResult]:
        t0 = time.time()
        orig_text = claim.claim_text
        text_lower = orig_text.lower()

        mutated_text = None
        expected_status = None
        explanation = ""
        evidence_ids = [claim.chunk_id] if claim.chunk_id else []
        evidence_snippet = claim.matching_source_snippet

        # Check if original claim has applicable evidence in the active corpus
        has_corpus_evidence = (
            claim.chunk_id is not None
            or len(claim.evidence_candidates) > 0
            or claim.status in (ClaimStatus.SUPPORTED, ClaimStatus.CONTRADICTED)
        )

        # 1. Numeric Swap Family
        if family == "numeric_swap":
            match = re.search(r'\b(\d+)\b', orig_text)
            if not match:
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
                    source_evidence_snippet=None,
                    explanation="Claim contains no numeric token eligible for numeric mutation.",
                    mismatch_reason="Excluded from evaluation denominator: no numeric quantity present.",
                    model_mode="DETERMINISTIC",
                    duration_ms=0.1,
                )

            curr_val = int(match.group(1))

            # Grounding check: If claim has no corpus evidence at all, numeric changes cannot be verified as true or false
            if not has_corpus_evidence and "leave" not in text_lower and "mfa" not in text_lower and "remote" not in text_lower:
                return MutationCaseResult(
                    test_id=test_id,
                    source_claim_id=claim.claim_id,
                    mutation_family=family,
                    original_text=orig_text,
                    mutated_text="[Ungrounded claim]",
                    expected_status="N/A",
                    actual_status="SKIPPED",
                    pass_fail_abstain=MutationOutcome.SKIPPED,
                    evidence_ids=[],
                    source_evidence_snippet=None,
                    explanation="Claim has no grounding in configured corpus; expected outcome for numeric mutation cannot be established reliably from active evidence.",
                    mismatch_reason="Excluded from denominator: ground truth cannot be established from active corpus.",
                    model_mode="DETERMINISTIC",
                    duration_ms=0.1,
                )

            # Check specific policy facts
            if "leave" in text_lower or "paid" in text_lower or "days" in text_lower:
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
                    new_val = 14 if claim.status == ClaimStatus.CONTRADICTED else curr_val + 5
                    mutated_text = orig_text[:match.start()] + str(new_val) + orig_text[match.end():]
                    if new_val == 14:
                        expected_status = "SUPPORTED"
                        explanation = f"Altered numeric quantity to canonical 14 days."
                    else:
                        expected_status = "CONTRADICTED"
                        explanation = f"Altered numeric quantity from {curr_val} to {new_val}, conflicting with canonical policy."
            elif "business days" in text_lower or "notice" in text_lower or "approval" in text_lower:
                if curr_val == 5:
                    new_val = 1
                    mutated_text = orig_text[:match.start()] + str(new_val) + orig_text[match.end():]
                    expected_status = "CONTRADICTED"
                    explanation = "Mutated advance notice requirement from 5 business days to 1 day; Section 2.3 mandates at least 5 business days."
                else:
                    new_val = 5
                    mutated_text = orig_text[:match.start()] + str(new_val) + orig_text[match.end():]
                    expected_status = "SUPPORTED"
                    explanation = "Restored advance notice requirement to canonical 5 business days."
            elif "remote" in text_lower:
                if curr_val == 2:
                    new_val = 5
                    mutated_text = orig_text[:match.start()] + str(new_val) + orig_text[match.end():]
                    expected_status = "CONTRADICTED"
                    explanation = "Mutated remote work allowance from 2 days to 5 days; Section 1.1 permits up to 2 days/week only."
                else:
                    new_val = 2
                    mutated_text = orig_text[:match.start()] + str(new_val) + orig_text[match.end():]
                    expected_status = "SUPPORTED"
                    explanation = "Aligned remote work days with canonical hybrid cap (2 days/week)."
            else:
                new_val = curr_val + 5
                mutated_text = orig_text[:match.start()] + str(new_val) + orig_text[match.end():]
                expected_status = "CONTRADICTED"
                explanation = f"Altered numeric quantity from {curr_val} to {new_val}."

        # 2. Negation Flip Family
        elif family == "negation_flip":
            # If original claim was unsupported with no source evidence, inverting polarity is also unsupported
            # and cannot reliably establish a contradiction or entailment.
            if not has_corpus_evidence and "leave" not in text_lower and "mfa" not in text_lower and "remote" not in text_lower:
                return MutationCaseResult(
                    test_id=test_id,
                    source_claim_id=claim.claim_id,
                    mutation_family=family,
                    original_text=orig_text,
                    mutated_text="[Ungrounded claim]",
                    expected_status="N/A",
                    actual_status="SKIPPED",
                    pass_fail_abstain=MutationOutcome.SKIPPED,
                    evidence_ids=[],
                    source_evidence_snippet=None,
                    explanation="Original claim has no source evidence in the active corpus; inverting polarity cannot be verified against active evidence.",
                    mismatch_reason="Excluded from denominator: ground truth expectation cannot be reliably derived.",
                    model_mode="DETERMINISTIC",
                    duration_ms=0.1,
                )

            if re.search(r'\b(do not|does not|cannot|never|not)\b', orig_text, re.IGNORECASE):
                # Remove negation
                mutated_text = re.sub(r'\b(do not|does not|cannot|never|not)\s*', '', orig_text, flags=re.IGNORECASE)
                # If original claim was contradicted by stating a negative that policy affirms:
                if "leave" in text_lower or "approval" in text_lower or "mfa" in text_lower:
                    expected_status = "SUPPORTED"
                    explanation = "Removed negative polarity; restores statement to match canonical corporate entitlement/requirement."
                elif "unlimited remote" in text_lower:
                    # Policy says "does not offer unlimited remote work". Removing negation creates a false assertion.
                    expected_status = "UNSUPPORTED"
                    explanation = "Removed negative polarity from restriction; asserts unlimited remote work which has no entitlement."
                else:
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
                explanation = "Inverted affirmative entitlement into negation ('do not receive'). Canonical source explicitly grants entitlement."
            elif re.search(r'\b(require|requires|must)\b', orig_text, re.IGNORECASE):
                mutated_text = re.sub(
                    r'\b(require|requires|must)\b',
                    'do not require',
                    orig_text,
                    count=1,
                    flags=re.IGNORECASE,
                )
                expected_status = "CONTRADICTED"
                explanation = "Inverted mandatory requirement statement into negation ('do not require'). Canonical policy enforces this requirement."
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
                    source_evidence_snippet=None,
                    explanation="No suitable affirmative/negative verb anchor found to invert polarity safely.",
                    mismatch_reason="Excluded from denominator: no polarity anchor in claim.",
                    model_mode="DETERMINISTIC",
                    duration_ms=0.1,
                )

        # 3. Scope Shift Family
        elif family == "scope_shift":
            if "eligible full-time employees" in text_lower:
                mutated_text = re.sub(
                    r'eligible full-time employees',
                    'all employees, contractors, and temporary interns',
                    orig_text,
                    flags=re.IGNORECASE,
                )
                expected_status = "CONTRADICTED"
                explanation = "Broadened scope from full-time employees to all contractors and interns. Section 4.1 explicitly excludes contractors and temporary interns."
            elif "contractors" in text_lower or "interns" in text_lower:
                mutated_text = re.sub(
                    r'all employees including contractors and interns|contractors and interns|contractors',
                    'eligible full-time employees',
                    orig_text,
                    flags=re.IGNORECASE,
                )
                expected_status = "SUPPORTED"
                explanation = "Restricted scope back to eligible full-time employees, aligning with Section 4.1."
            elif "employees" in text_lower:
                mutated_text = re.sub(
                    r'\bemployees\b',
                    'all contract workers and external interns',
                    orig_text,
                    count=1,
                    flags=re.IGNORECASE,
                )
                expected_status = "CONTRADICTED"
                explanation = "Shifted eligibility scope to contract workers and interns. Section 4.1 explicitly excludes contractors from statutory leave."
            elif "designated sensitive systems" in text_lower:
                mutated_text = re.sub(
                    r'designated sensitive systems',
                    'all public guest workstations and cafeteria kiosks',
                    orig_text,
                    flags=re.IGNORECASE,
                )
                expected_status = "UNSUPPORTED"
                explanation = "Shifted scope of MFA to guest kiosks, which is unmentioned and unsupported by IT policy."
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
                    source_evidence_snippet=None,
                    explanation="No explicit employee or organizational scope identifier found in claim.",
                    mismatch_reason="Excluded from denominator: no scope identifier present.",
                    model_mode="DETERMINISTIC",
                    duration_ms=0.1,
                )

        # 4. Date / Period Shift Family
        elif family == "date_period_shift":
            if "calendar year" in text_lower or "per calendar year" in text_lower:
                mutated_text = re.sub(
                    r'per calendar year|calendar year',
                    'per calendar quarter',
                    orig_text,
                    flags=re.IGNORECASE,
                )
                expected_status = "CONTRADICTED"
                explanation = "Shifted policy accrual period from calendar year to calendar quarter. Policy specifies annual refresh on January 1."
            elif "annual" in text_lower:
                mutated_text = re.sub(r'\bannual\b', 'monthly', orig_text, flags=re.IGNORECASE)
                expected_status = "CONTRADICTED"
                explanation = "Shifted annual cadence to monthly, contradicting annual leave rules."
            elif "5 business days" in text_lower:
                mutated_text = re.sub(r'5 business days', '30 business days', orig_text, flags=re.IGNORECASE)
                expected_status = "CONTRADICTED"
                explanation = "Shifted advance notice period from 5 business days to 30 business days. Section 2.3 mandates 5 business days."
            elif "within 1 hour" in text_lower:
                mutated_text = re.sub(r'within 1 hour', 'within 48 hours', orig_text, flags=re.IGNORECASE)
                expected_status = "CONTRADICTED"
                explanation = "Shifted security reporting deadline from 1 hour to 48 hours. Section 5.1 strictly mandates reporting within 1 hour."
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
                    source_evidence_snippet=None,
                    explanation="No calendar period, deadline, or frequency term found in claim.",
                    mismatch_reason="Excluded from denominator: no temporal/frequency token present.",
                    model_mode="DETERMINISTIC",
                    duration_ms=0.1,
                )

        # 5. Qualifier Change Family
        elif family == "qualifier_change":
            if "require" in text_lower or "requires" in text_lower:
                mutated_text = re.sub(
                    r'\b(require|requires)\b',
                    'optionally suggest',
                    orig_text,
                    count=1,
                    flags=re.IGNORECASE,
                )
                expected_status = "CONTRADICTED"
                explanation = "Weakened mandatory requirement to optional recommendation, violating policy mandate."
            elif "unlimited" in text_lower:
                mutated_text = re.sub(r'unlimited', 'up to 2 scheduled days of', orig_text, flags=re.IGNORECASE)
                expected_status = "SUPPORTED"
                explanation = "Aligned qualifier with hybrid policy allowance (up to 2 scheduled days/week)."
            elif "must" in text_lower or "strictly mandatory" in text_lower:
                mutated_text = re.sub(r'strictly mandatory|\bmust\b', 'may optionally', orig_text, flags=re.IGNORECASE)
                expected_status = "CONTRADICTED"
                explanation = "Replaced mandatory obligation with permissive 'may optionally'. Corporate policy strictly mandates compliance."
            elif "optional" in text_lower and ("mfa" in text_lower or "authentication" in text_lower):
                mutated_text = re.sub(r'optional', 'mandatory', orig_text, flags=re.IGNORECASE)
                expected_status = "SUPPORTED"
                explanation = "Strengthened optional MFA statement to mandatory, directly aligning with Section 1.2."
            elif "passwords only" in text_lower:
                mutated_text = re.sub(r'passwords only', 'Multi-Factor Authentication (MFA)', orig_text, flags=re.IGNORECASE)
                expected_status = "SUPPORTED"
                explanation = "Restored MFA requirement, aligning with canonical IT security protocols."
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
                    source_evidence_snippet=None,
                    explanation="No modal qualifier ('must', 'requires', 'unlimited', 'mandatory') present to mutate.",
                    mismatch_reason="Excluded from denominator: no modal qualifier present.",
                    model_mode="DETERMINISTIC",
                    duration_ms=0.1,
                )

        if not mutated_text:
            return None

        # Execute verifier on mutated claim using same corpus context
        candidates = hybrid_retriever.retrieve(mutated_text, top_k=3, corpus_id=corpus_id)
        actual_verification = nli_verifier.verify_claim(
            claim_id=f"{test_id}-V",
            claim_text=mutated_text,
            candidates=candidates,
            demo_mode=demo_mode,
        )

        actual_status = actual_verification.status.value
        if actual_verification.chunk_id:
            evidence_ids.append(actual_verification.chunk_id)
            evidence_snippet = actual_verification.matching_source_snippet or evidence_snippet

        # Pass / Fail / Abstain determination
        mismatch_reason = None
        if actual_status == expected_status:
            outcome = MutationOutcome.PASS
        elif actual_status == "REVIEW" or expected_status == "REVIEW":
            outcome = MutationOutcome.ABSTAIN
            mismatch_reason = "Verifier or expectation encountered ambiguous or conflicting evidence."
        else:
            outcome = MutationOutcome.FAIL
            mismatch_reason = (
                f"Verifier predicted '{actual_status}', but source evidence dictates '{expected_status}'. "
                f"Evaluation: {actual_verification.explanation}"
            )

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
            source_evidence_snippet=evidence_snippet,
            explanation=explanation,
            mismatch_reason=mismatch_reason,
            model_mode=model_mode_str,
            duration_ms=duration_ms,
        )


mutation_generator = MutationGenerator()
