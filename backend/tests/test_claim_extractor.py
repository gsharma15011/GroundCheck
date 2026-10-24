"""Tests for claim extraction.
"""
from app.engine.claim_extractor import claim_extractor


def test_claim_extraction_preserves_numbers_and_conjunctions():
    text = "According to Acme Policy, employees get 20 paid leave days and unlimited remote work."
    claims = claim_extractor.extract_claims(text)
    
    assert len(claims) == 2
    claim_texts = [c["claim_text"] for c in claims]
    
    # Claim 1 contains 20 paid leave days
    assert any("20 paid leave days" in t for t in claim_texts)
    # Claim 2 contains remote work
    assert any("remote work" in t for t in claim_texts)
    # Both preserve context prefix or subject
    assert all("According to Acme Policy" in t for t in claim_texts)


def test_claim_extraction_negation_preservation():
    text = "Employees do not receive overtime pay. Requests must not be submitted without approval."
    claims = claim_extractor.extract_claims(text)
    
    assert len(claims) == 2
    assert "do not receive" in claims[0]["claim_text"]
    assert "must not be" in claims[1]["claim_text"]


def test_empty_claim_extraction():
    assert claim_extractor.extract_claims("") == []
    assert claim_extractor.extract_claims("   \n\t  ") == []
