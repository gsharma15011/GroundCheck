"""Tests for fact guard and numerical contradiction detection.
"""
from app.engine.fact_guard import fact_guard
from app.engine.document_loader import corpus_loader


def test_fact_guard_detects_numerical_contradiction():
    # 20 days vs canonical 14 days
    claim = "According to Acme Policy, employees get 20 paid leave days."
    chunks = corpus_loader.get_all_chunks()
    
    result = fact_guard.check_claim(claim, chunks)
    assert result.checked is True
    assert result.passed is False
    assert result.conflict_detected is True
    assert "Numerical conflict" in result.reason
    assert result.detected_facts.get("value") == 20
    assert result.canonical_match.get("value") == 14


def test_fact_guard_confirms_matching_canonical_value():
    claim = "Eligible full-time employees receive 14 paid leave days per calendar year."
    chunks = corpus_loader.get_all_chunks()
    
    result = fact_guard.check_claim(claim, chunks)
    assert result.checked is True
    assert result.passed is True
    assert result.conflict_detected is False


def test_fact_guard_flags_unlimited_remote_work_as_unsupported():
    claim = "Acme offers employees unlimited remote work."
    chunks = corpus_loader.get_all_chunks()
    
    result = fact_guard.check_claim(claim, chunks)
    assert result.checked is True
    assert result.passed is False
    assert result.conflict_detected is False
    assert "No applicable remote work entitlement" in result.reason
