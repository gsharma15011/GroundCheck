"""Tests for answer sanitizer and re-verification logic.
"""
from app.engine.sanitizer import answer_sanitizer
from app.schemas import (
    ClaimVerificationResult,
    ClaimStatus,
    SanitizationPolicy,
    FactGuardResult,
)


def test_sanitizer_removes_unsupported_and_corrects_canonical():
    claim1 = ClaimVerificationResult(
        claim_id="CLM-001",
        claim_text="According to Acme Policy, employees get 20 paid leave days.",
        status=ClaimStatus.CONTRADICTED,
        confidence_score=0.95,
        matching_source_snippet="Eligible full-time employees receive 14 paid leave days per calendar year.",
        chunk_id="CHK-HR-001",
        document_id="DOC-HR-2026",
        retrieval_score=0.88,
        explanation="Contradicted by 14 days policy.",
        fact_guard=FactGuardResult(
            checked=True,
            passed=False,
            conflict_detected=True,
            detected_facts={"policy_key": "paid_leave_allowance", "value": 20},
            canonical_match={"policy_key": "paid_leave_allowance", "value": 14, "unit": "days", "scope": "eligible full-time employees", "period": "per calendar year"},
        ),
    )

    claim2 = ClaimVerificationResult(
        claim_id="CLM-002",
        claim_text="According to Acme Policy, employees get unlimited remote work.",
        status=ClaimStatus.UNSUPPORTED,
        confidence_score=0.90,
        retrieval_score=0.45,
        explanation="Unsupported assertion.",
        fact_guard=FactGuardResult(checked=False, passed=False),
    )

    sanitized_text, removed, replaced, warnings = answer_sanitizer.sanitize(
        query="How many paid leaves do employees get?",
        original_response="According to Acme Policy, employees get 20 paid leave days and unlimited remote work.",
        initial_claims=[claim1, claim2],
        policy=SanitizationPolicy.CORRECT_FROM_CANONICAL_SOURCE,
    )

    # 1. 20 days corrected to 14 days
    assert "14 paid leave days" in sanitized_text
    assert len(replaced) == 1
    assert replaced[0].canonical_chunk_id == "CHK-HR-001"

    # 2. Unlimited remote work removed
    assert "unlimited remote work" not in sanitized_text
    assert len(removed) == 1
    assert "unlimited remote work" in removed[0]
