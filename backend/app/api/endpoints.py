"""API route handlers for GroundCheck.
"""
import time
import uuid
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query, status

from ..schemas import (
    VerifyRequest,
    VerifyResponse,
    SanitizeRequest,
    SanitizeResponse,
    MutationSuiteRequest,
    MutationSuiteResponse,
    EvidenceChunkItem,
    HistorySummaryItem,
    StatusResponse,
    LineageGraph,
    ErrorResponse,
    ClaimStatus,
)
from ..engine.claim_extractor import claim_extractor
from ..engine.retrieval import hybrid_retriever
from ..engine.nli_verifier import nli_verifier
from ..engine.scoring import compute_audit_metrics
from ..engine.sanitizer import answer_sanitizer
from ..engine.mutation_generator import mutation_generator
from ..engine.lineage import generate_lineage_graph
from ..engine.history_manager import history_manager
from ..engine.document_loader import corpus_loader
from ..engine.embeddings import embedding_manager

router = APIRouter(prefix="/api")


@router.post("/verify", response_model=VerifyResponse)
def verify_answer(request: VerifyRequest) -> VerifyResponse:
    start_time = time.time()
    audit_id = f"AUD-{uuid.uuid4().hex[:8]}"
    warnings = []

    # 1. Claim extraction
    extracted = claim_extractor.extract_claims(request.response)
    if not extracted:
        warnings.append("No factual claims were extracted from the provided text.")

    # 2. Candidate retrieval and NLI verification for each claim
    verified_claims = []
    for item in extracted:
        candidates = hybrid_retriever.retrieve(
            query=item["claim_text"],
            top_k=request.top_k,
            corpus_id=request.corpus_id,
        )
        claim_result = nli_verifier.verify_claim(
            claim_id=item["claim_id"],
            claim_text=item["claim_text"],
            candidates=candidates,
            demo_mode=request.demo_mode,
        )
        verified_claims.append(claim_result)

    elapsed_ms = (time.time() - start_time) * 1000

    # 3. Compute audit metrics
    metrics = compute_audit_metrics(verified_claims, processing_time_ms=elapsed_ms)

    # 4. Engine readiness label
    if request.demo_mode:
        readiness = "DEMO"
    elif nli_verifier.is_ready and embedding_manager.is_ready:
        readiness = "LIVE"
    else:
        readiness = "DEGRADED"
        if not nli_verifier.is_ready:
            warnings.append("NLI model not fully loaded; evaluated via rule/lexical guardrails.")

    response_obj = VerifyResponse(
        audit_id=audit_id,
        query=request.query,
        raw_response=request.response,
        claims=verified_claims,
        metrics=metrics,
        engine_readiness=readiness,
        processing_time_ms=round(elapsed_ms, 2),
        warnings=warnings,
    )

    # Save to session history
    history_manager.save_audit(response_obj)

    return response_obj


@router.post("/sanitize", response_model=SanitizeResponse)
def sanitize_answer(request: SanitizeRequest) -> SanitizeResponse:
    # 1. First-pass verification if audit_id not supplied or fresh verify needed
    existing = history_manager.get_audit(request.audit_id) if request.audit_id else None
    if existing:
        initial_audit = VerifyResponse(**existing["audit"])
    else:
        # Run first-pass verification
        first_pass_req = VerifyRequest(
            query=request.query,
            response=request.response,
            corpus_id=request.corpus_id,
            demo_mode=request.demo_mode,
        )
        initial_audit = verify_answer(first_pass_req)

    # 2. Sanitize using requested policy
    sanitized_text, removed_claims, replaced_claims, sanitize_warnings = answer_sanitizer.sanitize(
        query=request.query,
        original_response=request.response,
        initial_claims=initial_audit.claims,
        policy=request.policy,
        preserve_supported=request.preserve_supported_claims,
    )

    # 3. MANDATORY INDEPENDENT SECOND-PASS AUDIT
    second_pass_req = VerifyRequest(
        query=request.query,
        response=sanitized_text,
        corpus_id=request.corpus_id,
        demo_mode=request.demo_mode,
    )
    final_audit = verify_answer(second_pass_req)

    # Check if final audit is fully supported
    fully_supported = (
        final_audit.metrics.total_claims > 0
        and final_audit.metrics.contradicted_count == 0
        and final_audit.metrics.unsupported_count == 0
        and final_audit.metrics.review_count == 0
        and (final_audit.metrics.trust_score or 0) >= 99.0
    )

    if not fully_supported and len(final_audit.claims) > 0:
        sanitize_warnings.append(
            "Independent second-pass audit detected unverified residual statements in the sanitized text."
        )

    response_obj = SanitizeResponse(
        sanitized_response=sanitized_text,
        removed_claims=removed_claims,
        replaced_claims=replaced_claims,
        final_audit=final_audit,
        fully_supported=fully_supported,
        warnings=sanitize_warnings + final_audit.warnings,
        sanitization_policy=request.policy.value,
    )

    # Update session history entry with sanitization
    history_manager.save_audit(initial_audit, response_obj)

    return response_obj


@router.post("/mutation-tests", response_model=MutationSuiteResponse)
def run_mutation_tests(request: MutationSuiteRequest) -> MutationSuiteResponse:
    claims_to_test = []
    if request.claims:
        claims_to_test = request.claims
    elif request.audit_id:
        existing = history_manager.get_audit(request.audit_id)
        if existing:
            saved_audit = VerifyResponse(**existing["audit"])
            claims_to_test = saved_audit.claims

    if not claims_to_test:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No claims provided for mutation testing. Provide claims or a valid audit_id.",
        )

    return mutation_generator.generate_and_evaluate(
        claims=claims_to_test,
        mutation_families=request.mutation_families,
        max_cases=request.max_cases,
        demo_mode=request.demo_mode,
    )


@router.get("/lineage/{audit_id}", response_model=LineageGraph)
def get_audit_lineage(audit_id: str) -> LineageGraph:
    entry = history_manager.get_audit(audit_id)
    if not entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Audit '{audit_id}' not found in active session history.",
        )

    audit_data = VerifyResponse(**entry["audit"])
    sanit_data = SanitizeResponse(**entry["sanitization"]) if entry.get("sanitization") else None

    return generate_lineage_graph(
        audit_id=audit_id,
        claims=audit_data.claims,
        replaced_claims=sanit_data.replaced_claims if sanit_data else None,
        removed_claims=sanit_data.removed_claims if sanit_data else None,
        final_audit=sanit_data.final_audit if sanit_data else None,
    )


@router.get("/evidence", response_model=List[EvidenceChunkItem])
def get_evidence(
    search: Optional[str] = Query(None),
    corpus_id: Optional[str] = Query(None),
    document_type: Optional[str] = Query(None),
    version: Optional[str] = Query(None),
) -> List[EvidenceChunkItem]:
    return corpus_loader.get_evidence_items(
        search=search,
        corpus_id=corpus_id,
        document_type=document_type,
        version=version,
    )


@router.get("/history", response_model=List[HistorySummaryItem])
def get_audit_history() -> List[HistorySummaryItem]:
    return history_manager.get_summaries()


@router.get("/history/{audit_id}")
def get_single_audit_history(audit_id: str):
    entry = history_manager.get_audit(audit_id)
    if not entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Audit '{audit_id}' not found in history.",
        )
    return entry


@router.delete("/history")
def clear_audit_history():
    history_manager.clear_history()
    return {"message": "Audit session history cleared successfully."}


@router.get("/status", response_model=StatusResponse)
def get_status() -> StatusResponse:
    corpus_docs = len(corpus_loader.documents)
    corpus_chunks = len(corpus_loader.chunks)
    retrieval_ready = embedding_manager.is_ready
    nli_ready = nli_verifier.is_ready

    if retrieval_ready and nli_ready:
        mode = "LIVE"
    elif retrieval_ready or nli_ready:
        mode = "DEGRADED"
    else:
        mode = "DEMO"

    errors = []
    if embedding_manager.error:
        errors.append(f"Embedding Model: {embedding_manager.error}")
    if nli_verifier.error:
        errors.append(f"NLI Model: {nli_verifier.error}")

    return StatusResponse(
        api_ready=True,
        corpus_loaded=corpus_docs > 0,
        corpus_documents_count=corpus_docs,
        corpus_chunks_count=corpus_chunks,
        retrieval_model_ready=retrieval_ready,
        nli_model_ready=nli_ready,
        current_mode=mode,
        version="2.0.0",
        device=embedding_manager.device,
        model_init_errors=errors,
    )
