"""Scoring module for GroundCheck audit metrics.
Computes trust score and verification coverage strictly according to PRD formulas.
"""
from typing import List, Optional
from ..schemas import ClaimVerificationResult, ClaimStatus, AuditMetrics


def compute_audit_metrics(
    claims: List[ClaimVerificationResult],
    processing_time_ms: float = 0.0,
) -> AuditMetrics:
    total_claims = len(claims)
    if total_claims == 0:
        return AuditMetrics(
            trust_score=None,
            verification_coverage=1.0,
            supported_count=0,
            unsupported_count=0,
            contradicted_count=0,
            review_count=0,
            total_claims=0,
            evaluated_claims=0,
            processing_time_ms=round(processing_time_ms, 2),
        )

    supported_count = sum(1 for c in claims if c.status == ClaimStatus.SUPPORTED)
    unsupported_count = sum(1 for c in claims if c.status == ClaimStatus.UNSUPPORTED)
    contradicted_count = sum(1 for c in claims if c.status == ClaimStatus.CONTRADICTED)
    review_count = sum(1 for c in claims if c.status == ClaimStatus.REVIEW)

    evaluated_claims = supported_count + unsupported_count + contradicted_count + review_count
    
    # Trust Score = 100 * supported_count / total_claims
    trust_score = round(100.0 * supported_count / total_claims, 2)
    # Verification Coverage = evaluated_claims / total_claims
    coverage = round(evaluated_claims / total_claims, 4)

    return AuditMetrics(
        trust_score=trust_score,
        verification_coverage=coverage,
        supported_count=supported_count,
        unsupported_count=unsupported_count,
        contradicted_count=contradicted_count,
        review_count=review_count,
        total_claims=total_claims,
        evaluated_claims=evaluated_claims,
        processing_time_ms=round(processing_time_ms, 2),
    )
