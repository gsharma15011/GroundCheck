"""Pydantic v2 schemas and data contracts for GroundCheck.
"""
from enum import Enum
from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel, Field


class ClaimStatus(str, Enum):
    SUPPORTED = "SUPPORTED"
    UNSUPPORTED = "UNSUPPORTED"
    CONTRADICTED = "CONTRADICTED"
    REVIEW = "REVIEW"


class EngineMode(str, Enum):
    LIVE = "LIVE"
    DEMO = "DEMO"
    DEGRADED = "DEGRADED"


class SanitizationPolicy(str, Enum):
    REMOVE_UNSAFE = "remove_unsafe"
    CORRECT_FROM_CANONICAL_SOURCE = "correct_from_canonical_source"


class MutationOutcome(str, Enum):
    PASS = "PASS"
    FAIL = "FAIL"
    ABSTAIN = "ABSTAIN"
    SKIPPED = "SKIPPED"


class SourceLocation(BaseModel):
    page: Optional[int] = None
    line_start: Optional[int] = None
    line_end: Optional[int] = None
    section: Optional[str] = None


class NLIScores(BaseModel):
    entailment: float = 0.0
    neutral: float = 0.0
    contradiction: float = 0.0


class FactGuardResult(BaseModel):
    checked: bool = False
    passed: bool = True
    detected_facts: Dict[str, Any] = Field(default_factory=dict)
    canonical_match: Optional[Dict[str, Any]] = None
    conflict_detected: bool = False
    reason: Optional[str] = None


class ConflictMetadata(BaseModel):
    has_conflict: bool = False
    conflict_type: Optional[str] = None
    details: Optional[str] = None


class EvidenceCandidate(BaseModel):
    chunk_id: str
    document_id: str
    document_name: str
    section: str
    text: str
    retrieval_score: float
    dense_score: Optional[float] = None
    lexical_score: Optional[float] = None
    nli_scores: Optional[NLIScores] = None
    is_canonical: bool = False
    version: Optional[str] = None
    policy_category: Optional[str] = None


class ClaimVerificationResult(BaseModel):
    claim_id: str
    claim_text: str
    status: ClaimStatus
    confidence_score: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Decision confidence score (0-1), not probability of truth.",
    )
    matching_source_snippet: Optional[str] = None
    document_name: Optional[str] = None
    document_id: Optional[str] = None
    chunk_id: Optional[str] = None
    source_location: Optional[SourceLocation] = None
    retrieval_score: float = 0.0
    nli_scores: Optional[NLIScores] = None
    explanation: str
    fact_guard: Optional[FactGuardResult] = None
    conflict_metadata: Optional[ConflictMetadata] = None
    evidence_candidates: List[EvidenceCandidate] = Field(default_factory=list)


class AuditMetrics(BaseModel):
    trust_score: Optional[float] = Field(
        None,
        description="100 * supported_count / total_claims. Null if no claims exist.",
    )
    verification_coverage: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="claims evaluated / total claims extracted.",
    )
    supported_count: int = 0
    unsupported_count: int = 0
    contradicted_count: int = 0
    review_count: int = 0
    total_claims: int = 0
    evaluated_claims: int = 0
    processing_time_ms: float = 0.0


class VerifyRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=2000)
    response: str = Field(..., min_length=1, max_length=20000)
    corpus_id: Optional[str] = "acme_corporate_policies"
    top_k: int = Field(5, ge=1, le=10)
    demo_mode: bool = False


class VerifyResponse(BaseModel):
    audit_id: str
    query: str
    raw_response: str
    claims: List[ClaimVerificationResult]
    metrics: AuditMetrics
    engine_readiness: str  # LIVE, DEMO, or DEGRADED
    processing_time_ms: float
    warnings: List[str] = Field(default_factory=list)


class ReplacedClaim(BaseModel):
    original_claim: str
    replacement_claim: str
    canonical_chunk_id: str
    canonical_fact: str


class SanitizeRequest(BaseModel):
    query: str
    response: str
    audit_id: Optional[str] = None
    corpus_id: Optional[str] = "acme_corporate_policies"
    policy: SanitizationPolicy = SanitizationPolicy.CORRECT_FROM_CANONICAL_SOURCE
    preserve_supported_claims: bool = True
    demo_mode: bool = False


class SanitizeResponse(BaseModel):
    sanitized_response: str
    removed_claims: List[str] = Field(default_factory=list)
    replaced_claims: List[ReplacedClaim] = Field(default_factory=list)
    final_audit: VerifyResponse
    fully_supported: bool
    warnings: List[str] = Field(default_factory=list)
    sanitization_policy: str


class MutationCaseResult(BaseModel):
    test_id: str
    source_claim_id: str
    mutation_family: str  # numeric, negation, date_period, scope, qualifier
    original_text: str
    mutated_text: str
    expected_status: str
    actual_status: str
    pass_fail_abstain: MutationOutcome
    evidence_ids: List[str] = Field(default_factory=list)
    explanation: str
    model_mode: str
    duration_ms: float


class MutationSuiteRequest(BaseModel):
    audit_id: Optional[str] = None
    claims: Optional[List[ClaimVerificationResult]] = None
    mutation_families: Optional[List[str]] = None
    max_cases: int = Field(20, ge=1, le=50)
    demo_mode: bool = False


class MutationSuiteResponse(BaseModel):
    suite_id: str
    cases: List[MutationCaseResult]
    passed: int
    failed: int
    abstained: int
    skipped: int
    evaluated_count: int
    robustness_score: Optional[float] = Field(
        None,
        description="Correctly flagged applicable mutations / applicable mutations evaluated. Null if no applicable cases.",
    )
    coverage: float = Field(..., ge=0.0, le=1.0)
    mode: str
    processing_time_ms: float


class LineageNode(BaseModel):
    id: str
    label: str
    type: str  # claim, evidence_chunk, source_document, verdict, sanitization_action, final_claim
    metadata: Dict[str, Any] = Field(default_factory=dict)


class LineageEdge(BaseModel):
    id: str
    source: str
    target: str
    type: str  # supported_by, contradicted_by, derived_from, removed_by, replaced_by, reverified_as
    label: Optional[str] = None


class LineageGraph(BaseModel):
    audit_id: str
    nodes: List[LineageNode]
    edges: List[LineageEdge]


class EvidenceChunkItem(BaseModel):
    chunk_id: str
    document_id: str
    document_name: str
    section: str
    version: str
    policy_category: str
    text: str
    is_canonical: bool = True
    references_count: int = 0


class HistorySummaryItem(BaseModel):
    audit_id: str
    timestamp: str
    query_snippet: str
    mode: str
    trust_score: Optional[float]
    total_claims: int
    supported_count: int
    unsupported_count: int
    contradicted_count: int
    review_count: int
    sanitized: bool
    fully_supported: Optional[bool]


class StatusResponse(BaseModel):
    api_ready: bool = True
    corpus_loaded: bool = False
    corpus_documents_count: int = 0
    corpus_chunks_count: int = 0
    retrieval_model_ready: bool = False
    nli_model_ready: bool = False
    current_mode: str = "DEGRADED"  # LIVE, DEMO, DEGRADED
    version: str = "2.0.0"
    device: str = "cpu"
    model_init_errors: List[str] = Field(default_factory=list)


class ErrorResponse(BaseModel):
    error_code: str
    detail: str
    request_id: Optional[str] = None
