"""Evidence lineage graph generator for GroundCheck.
Constructs structured nodes and edges connecting claims, chunks, documents, verdicts,
sanitization actions, and final re-verified claims.
"""
from typing import List, Dict, Any, Optional
from ..schemas import (
    ClaimVerificationResult,
    ClaimStatus,
    LineageNode,
    LineageEdge,
    LineageGraph,
    ReplacedClaim,
    VerifyResponse,
)


def generate_lineage_graph(
    audit_id: str,
    claims: List[ClaimVerificationResult],
    replaced_claims: Optional[List[ReplacedClaim]] = None,
    removed_claims: Optional[List[str]] = None,
    final_audit: Optional[VerifyResponse] = None,
) -> LineageGraph:
    nodes: List[LineageNode] = []
    edges: List[LineageEdge] = []
    seen_nodes = set()

    def add_node(node_id: str, label: str, node_type: str, meta: Dict[str, Any] = None):
        if node_id not in seen_nodes:
            seen_nodes.add(node_id)
            nodes.append(
                LineageNode(
                    id=node_id,
                    label=label,
                    type=node_type,
                    metadata=meta or {},
                )
            )

    def add_edge(source: str, target: str, edge_type: str, label: Optional[str] = None):
        edge_id = f"{source}->{target}:{edge_type}"
        edges.append(
            LineageEdge(
                id=edge_id,
                source=source,
                target=target,
                type=edge_type,
                label=label,
            )
        )

    replaced_map = {r.original_claim: r for r in (replaced_claims or [])}
    removed_set = set(removed_claims or [])

    for c in claims:
        claim_node_id = f"node-{c.claim_id}"
        add_node(
            claim_node_id,
            label=f"{c.claim_id}: {c.claim_text[:45]}...",
            node_type="claim",
            meta={
                "claim_id": c.claim_id,
                "text": c.claim_text,
                "confidence": c.confidence_score,
            },
        )

        verdict_node_id = f"verdict-{c.claim_id}"
        add_node(
            verdict_node_id,
            label=f"Verdict: {c.status.value}",
            node_type="verdict",
            meta={
                "status": c.status.value,
                "explanation": c.explanation,
                "confidence": c.confidence_score,
            },
        )

        # Edge from claim to verdict
        add_edge(claim_node_id, verdict_node_id, "derived_from", "Evaluated As")

        # Evidence chunk node and edge
        if c.chunk_id:
            chunk_node_id = f"chunk-{c.chunk_id}"
            add_node(
                chunk_node_id,
                label=f"{c.chunk_id} ({c.document_name or 'Source'})",
                node_type="evidence_chunk",
                meta={
                    "chunk_id": c.chunk_id,
                    "section": c.source_location.section if c.source_location else "",
                    "snippet": c.matching_source_snippet,
                    "retrieval_score": c.retrieval_score,
                },
            )

            # Edge from chunk to verdict
            if c.status == ClaimStatus.SUPPORTED:
                add_edge(chunk_node_id, verdict_node_id, "supported_by", "Entails Claim")
            elif c.status == ClaimStatus.CONTRADICTED:
                add_edge(chunk_node_id, verdict_node_id, "contradicted_by", "Conflicts With")
            else:
                add_edge(chunk_node_id, verdict_node_id, "derived_from", "Candidate Evaluated")

            # Document node
            if c.document_id:
                doc_node_id = f"doc-{c.document_id}"
                add_node(
                    doc_node_id,
                    label=c.document_name or c.document_id,
                    node_type="source_document",
                    meta={"document_id": c.document_id, "document_name": c.document_name},
                )
                add_edge(doc_node_id, chunk_node_id, "derived_from", "Contains Chunk")

        # Sanitization action
        if c.claim_text in replaced_map:
            rep = replaced_map[c.claim_text]
            action_id = f"action-replace-{c.claim_id}"
            add_node(
                action_id,
                label=f"Replace: Canonical Correction ({rep.canonical_chunk_id})",
                node_type="sanitization_action",
                meta={"action": "replace", "canonical_fact": rep.canonical_fact},
            )
            add_edge(verdict_node_id, action_id, "replaced_by", "Corrected By Policy")

            # Final claim node
            final_claim_id = f"final-claim-{c.claim_id}"
            add_node(
                final_claim_id,
                label=f"Verified: {rep.replacement_claim[:40]}...",
                node_type="final_claim",
                meta={"text": rep.replacement_claim, "fully_supported": True},
            )
            add_edge(action_id, final_claim_id, "reverified_as", "Final Text")

        elif c.claim_text in removed_set or c.status in (ClaimStatus.UNSUPPORTED, ClaimStatus.CONTRADICTED):
            action_id = f"action-remove-{c.claim_id}"
            add_node(
                action_id,
                label="Action: Remove Unsubstantiated Assertion",
                node_type="sanitization_action",
                meta={"action": "remove", "reason": "Claim unsupported or contradicted"},
            )
            add_edge(verdict_node_id, action_id, "removed_by", "Excluded From Final")

        elif c.status == ClaimStatus.SUPPORTED:
            action_id = f"action-keep-{c.claim_id}"
            add_node(
                action_id,
                label="Action: Retain Supported Claim",
                node_type="sanitization_action",
                meta={"action": "keep"},
            )
            add_edge(verdict_node_id, action_id, "derived_from", "Preserved")

            final_claim_id = f"final-claim-{c.claim_id}"
            add_node(
                final_claim_id,
                label=f"Verified: {c.claim_text[:40]}...",
                node_type="final_claim",
                meta={"text": c.claim_text, "fully_supported": True},
            )
            add_edge(action_id, final_claim_id, "reverified_as", "Audited OK")

    return LineageGraph(audit_id=audit_id, nodes=nodes, edges=edges)
