"""Document loader and corpus manager for GroundCheck.
Loads structured documents and chunks with version metadata.
"""
import json
import os
from typing import List, Dict, Optional, Any
from pathlib import Path

from ..schemas import EvidenceChunkItem


class DocumentLoader:
    def __init__(self, corpus_path: Optional[str] = None):
        if corpus_path is None:
            base_dir = Path(__file__).resolve().parent.parent / "data"
            self.corpus_path = base_dir / "acme_corpus.json"
        else:
            self.corpus_path = Path(corpus_path)
            
        self.documents: List[Dict[str, Any]] = []
        self.chunks: List[Dict[str, Any]] = []
        self.chunk_by_id: Dict[str, Dict[str, Any]] = {}
        self.chunk_reference_counts: Dict[str, int] = {}
        self.load_corpus()

    def load_corpus(self) -> None:
        if not self.corpus_path.exists():
            raise FileNotFoundError(f"Corpus file not found: {self.corpus_path}")
            
        with open(self.corpus_path, "r", encoding="utf-8") as f:
            raw_docs = json.load(f)
            
        self.documents = raw_docs
        self.chunks = []
        self.chunk_by_id = {}
        
        for doc in self.documents:
            doc_id = doc["document_id"]
            doc_name = doc["document_name"]
            version = doc.get("version", "1.0")
            policy_cat = doc.get("policy_category", "General")
            is_canonical = doc.get("is_canonical", True)
            
            for chk in doc.get("chunks", []):
                chunk_entry = {
                    "chunk_id": chk["chunk_id"],
                    "document_id": doc_id,
                    "document_name": doc_name,
                    "section": chk.get("section", ""),
                    "version": version,
                    "policy_category": policy_cat,
                    "is_canonical": is_canonical,
                    "page": chk.get("page"),
                    "line_start": chk.get("line_start"),
                    "line_end": chk.get("line_end"),
                    "text": chk.get("text", ""),
                    "canonical_facts": chk.get("canonical_facts", {}),
                }
                self.chunks.append(chunk_entry)
                self.chunk_by_id[chk["chunk_id"]] = chunk_entry
                if chk["chunk_id"] not in self.chunk_reference_counts:
                    self.chunk_reference_counts[chk["chunk_id"]] = 0

    def record_chunk_citation(self, chunk_id: str) -> None:
        if chunk_id in self.chunk_reference_counts:
            self.chunk_reference_counts[chunk_id] += 1

    def get_chunk(self, chunk_id: str) -> Optional[Dict[str, Any]]:
        return self.chunk_by_id.get(chunk_id)

    def get_all_chunks(self) -> List[Dict[str, Any]]:
        return self.chunks

    def get_evidence_items(
        self,
        search: Optional[str] = None,
        corpus_id: Optional[str] = None,
        document_type: Optional[str] = None,
        version: Optional[str] = None,
    ) -> List[EvidenceChunkItem]:
        results = []
        for chk in self.chunks:
            # Filters
            if document_type and chk["policy_category"].lower() != document_type.lower():
                continue
            if version and chk["version"] != version:
                continue
            if search:
                term = search.lower()
                in_text = term in chk["text"].lower()
                in_section = term in chk["section"].lower()
                in_doc = term in chk["document_name"].lower()
                in_id = term in chk["chunk_id"].lower()
                if not (in_text or in_section or in_doc or in_id):
                    continue
                    
            ref_count = self.chunk_reference_counts.get(chk["chunk_id"], 0)
            results.append(
                EvidenceChunkItem(
                    chunk_id=chk["chunk_id"],
                    document_id=chk["document_id"],
                    document_name=chk["document_name"],
                    section=chk["section"],
                    version=chk["version"],
                    policy_category=chk["policy_category"],
                    text=chk["text"],
                    is_canonical=chk["is_canonical"],
                    references_count=ref_count,
                )
            )
        return results


# Global singleton instance
corpus_loader = DocumentLoader()
