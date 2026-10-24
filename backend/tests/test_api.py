"""End-to-end API tests for GroundCheck.
"""
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_and_status():
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"

    res_status = client.get("/api/status")
    assert res_status.status_code == 200
    data = res_status.json()
    assert data["api_ready"] is True
    assert data["corpus_loaded"] is True
    assert data["corpus_documents_count"] > 0
    assert data["corpus_chunks_count"] > 0


def test_mandatory_acme_demo_verification():
    """Validates the exact mandatory demo required by the PRD:
    Question: 'How many paid leaves do employees get?'
    Answer: 'According to Acme Policy, employees get 20 paid leave days and unlimited remote work.'
    Expectations:
    - 20-day claim is CONTRADICTED by 14-day policy
    - unlimited-remote-work is UNSUPPORTED
    - exact 14-day source excerpt is present
    """
    payload = {
        "query": "How many paid leaves do employees get?",
        "response": "According to Acme Policy, employees get 20 paid leave days and unlimited remote work.",
        "corpus_id": "acme_corporate_policies",
        "demo_mode": True,
    }
    res = client.post("/api/verify", json=payload)
    assert res.status_code == 200
    data = res.json()

    assert data["audit_id"].startswith("AUD-")
    assert len(data["claims"]) == 2

    # Claim 1: 20 paid leave days -> CONTRADICTED
    c1 = next((c for c in data["claims"] if "20" in c["claim_text"]), None)
    assert c1 is not None
    assert c1["status"] == "CONTRADICTED"
    assert "CHK-HR-001" in c1["chunk_id"]
    assert "14 paid leave days" in c1["matching_source_snippet"]

    # Claim 2: unlimited remote work -> UNSUPPORTED
    c2 = next((c for c in data["claims"] if "remote work" in c["claim_text"].lower()), None)
    assert c2 is not None
    assert c2["status"] == "UNSUPPORTED"

    # Trust score should be 0 because 0/2 claims are supported
    assert data["metrics"]["trust_score"] == 0.0
    assert data["metrics"]["contradicted_count"] == 1
    assert data["metrics"]["unsupported_count"] == 1
    assert data["metrics"]["supported_count"] == 0


def test_mandatory_acme_sanitization_and_second_audit():
    """Validates that sanitization corrects 20 days -> 14 days, removes unlimited remote work,
    and runs a real second audit that is fully supported.
    """
    payload = {
        "query": "How many paid leaves do employees get?",
        "response": "According to Acme Policy, employees get 20 paid leave days and unlimited remote work.",
        "policy": "correct_from_canonical_source",
        "demo_mode": True,
    }
    res = client.post("/api/sanitize", json=payload)
    assert res.status_code == 200
    data = res.json()

    sanitized = data["sanitized_response"]
    assert "14 paid leave days" in sanitized
    assert "unlimited remote work" not in sanitized

    # Check replacements and removals
    assert len(data["replaced_claims"]) == 1
    assert len(data["removed_claims"]) == 1

    # Second audit verification
    final_audit = data["final_audit"]
    assert final_audit["metrics"]["trust_score"] == 100.0
    assert data["fully_supported"] is True


def test_mutation_suite_api():
    payload = {
        "claims": [
            {
                "claim_id": "CLM-001",
                "claim_text": "Eligible full-time employees receive 14 paid leave days per calendar year.",
                "status": "SUPPORTED",
                "confidence_score": 0.95,
                "chunk_id": "CHK-HR-001",
                "explanation": "Supported by Section 2.1.",
            }
        ],
        "mutation_families": ["numeric_swap"],
        "demo_mode": True,
    }
    res = client.post("/api/mutation-tests", json=payload)
    assert res.status_code == 200
    data = res.json()

    assert data["evaluated_count"] >= 1
    assert data["passed"] >= 1
    assert data["robustness_score"] == 100.0


def test_evidence_and_lineage_api():
    # Fetch evidence list
    res = client.get("/api/evidence")
    assert res.status_code == 200
    chunks = res.json()
    assert len(chunks) >= 4
    assert any(c["chunk_id"] == "CHK-HR-001" for c in chunks)

    # Filter evidence
    res_hr = client.get("/api/evidence?document_type=Human Resources")
    assert res_hr.status_code == 200
    hr_chunks = res_hr.json()
    assert all(c["policy_category"] == "Human Resources" for c in hr_chunks)

    # Verify an audit and get its lineage
    verify_res = client.post("/api/verify", json={
        "query": "How many leaves?",
        "response": "Employees receive 14 paid leave days.",
        "demo_mode": True,
    })
    audit_id = verify_res.json()["audit_id"]

    lineage_res = client.get(f"/api/lineage/{audit_id}")
    assert lineage_res.status_code == 200
    lineage = lineage_res.json()
    assert len(lineage["nodes"]) > 0
    assert len(lineage["edges"]) > 0
