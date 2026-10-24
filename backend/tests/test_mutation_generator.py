"""Tests for Claim Mutation Lab.
"""
from app.engine.mutation_generator import mutation_generator
from app.schemas import ClaimVerificationResult, ClaimStatus, MutationOutcome


def test_mutation_generator_numeric_swap():
    claim = ClaimVerificationResult(
        claim_id="CLM-001",
        claim_text="According to Acme Policy, eligible full-time employees receive 14 paid leave days per calendar year.",
        status=ClaimStatus.SUPPORTED,
        confidence_score=0.96,
        chunk_id="CHK-HR-001",
        document_id="DOC-HR-2026",
        explanation="Supported by canonical policy.",
    )

    suite = mutation_generator.generate_and_evaluate(
        claims=[claim],
        mutation_families=["numeric_swap"],
        demo_mode=True,
    )

    assert suite.evaluated_count >= 1
    # Check that 14 was swapped to 20
    numeric_case = next((c for c in suite.cases if c.mutation_family == "numeric_swap"), None)
    assert numeric_case is not None
    assert "20" in numeric_case.mutated_text
    assert numeric_case.expected_status == "CONTRADICTED"
    assert numeric_case.actual_status == "CONTRADICTED"
    assert numeric_case.pass_fail_abstain == MutationOutcome.PASS
    assert suite.robustness_score is not None
    assert suite.robustness_score == 100.0


def test_skipped_mutations_excluded_from_denominator():
    # Claim with no numbers
    claim = ClaimVerificationResult(
        claim_id="CLM-002",
        claim_text="Acme Corp requires regular security hygiene.",
        status=ClaimStatus.UNSUPPORTED,
        confidence_score=0.8,
        explanation="No direct evidence.",
    )

    suite = mutation_generator.generate_and_evaluate(
        claims=[claim],
        mutation_families=["numeric_swap"],
        demo_mode=True,
    )

    assert suite.skipped == 1
    assert suite.evaluated_count == 0
    # Null robustness score when no applicable cases
    assert suite.robustness_score is None
