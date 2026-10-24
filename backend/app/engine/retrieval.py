"""Hybrid retrieval combining dense semantic similarity and BM25 lexical ranking.
"""
import re
import logging
from typing import List, Dict, Any, Optional
import numpy as np

try:
    from rank_bm25 import BM25Okapi
except ImportError:
    BM25Okapi = None

from .document_loader import corpus_loader
from .embeddings import embedding_manager
from ..config import settings
from ..schemas import EvidenceCandidate

logger = logging.getLogger(__name__)


def tokenize(text: str) -> List[str]:
    """Tokenize string into lowercase alphanumeric words."""
    return re.findall(r"\b\w+\b", text.lower())


class HybridRetriever:
    def __init__(self):
        self.chunks: List[Dict[str, Any]] = []
        self.chunk_embeddings: Optional[np.ndarray] = None
        self.bm25: Optional[Any] = None
        self.tokenized_corpus: List[List[str]] = []
        self.corpus_initialized = False

    def build_index(self) -> None:
        """Builds BM25 index and computes dense embeddings for all corpus chunks.
        """
        self.chunks = corpus_loader.get_all_chunks()
        if not self.chunks:
            return

        # Build BM25 index
        self.tokenized_corpus = [tokenize(c["text"]) for c in self.chunks]
        if BM25Okapi and self.tokenized_corpus:
            self.bm25 = BM25Okapi(self.tokenized_corpus)

        # Precompute chunk embeddings if embedding model is ready
        texts = [c["text"] for c in self.chunks]
        self.chunk_embeddings = embedding_manager.embed_texts(texts)
        self.corpus_initialized = True

    def retrieve(
        self,
        query: str,
        top_k: int = 5,
        corpus_id: Optional[str] = None,
        filter_canonical_only: bool = False,
    ) -> List[EvidenceCandidate]:
        """Retrieves top-k evidence candidate chunks using hybrid dense + lexical scoring.
        """
        if not self.corpus_initialized or not self.chunks:
            self.build_index()

        if not self.chunks:
            return []

        # 1. Lexical BM25 Scores
        query_tokens = tokenize(query)
        if self.bm25 and query_tokens:
            bm25_raw_scores = self.bm25.get_scores(query_tokens)
            max_bm25 = np.max(bm25_raw_scores) if len(bm25_raw_scores) > 0 else 1.0
            if max_bm25 > 0:
                lexical_scores = bm25_raw_scores / max_bm25
            else:
                lexical_scores = np.zeros(len(self.chunks))
        else:
            # Fallback token overlap
            q_set = set(query_tokens)
            lexical_scores = np.array([
                len(set(toks) & q_set) / max(len(q_set), 1)
                for toks in self.tokenized_corpus
            ])

        # 2. Dense Semantic Scores
        dense_available = False
        dense_scores = np.zeros(len(self.chunks))

        if self.chunk_embeddings is not None and embedding_manager.is_ready:
            query_emb = embedding_manager.embed_texts([query])
            if query_emb is not None:
                # Cosine similarity on normalized embeddings
                dense_scores = np.dot(self.chunk_embeddings, query_emb[0])
                # Clip into [0, 1] range for stability
                dense_scores = np.clip((dense_scores + 1.0) / 2.0, 0.0, 1.0)
                dense_available = True

        # 3. Hybrid Fusion
        if dense_available:
            w_dense = settings.dense_retrieval_weight
            w_lex = settings.lexical_retrieval_weight
            combined_scores = (w_dense * dense_scores) + (w_lex * lexical_scores)
        else:
            combined_scores = lexical_scores

        # Rank candidate indices
        sorted_indices = np.argsort(combined_scores)[::-1]

        candidates = []
        for idx in sorted_indices:
            chk = self.chunks[idx]
            if filter_canonical_only and not chk.get("is_canonical", True):
                continue
            if corpus_id and chk.get("document_id") != corpus_id and corpus_id != "acme_corporate_policies":
                continue

            score = float(combined_scores[idx])
            d_score = float(dense_scores[idx]) if dense_available else None
            l_score = float(lexical_scores[idx])

            candidates.append(
                EvidenceCandidate(
                    chunk_id=chk["chunk_id"],
                    document_id=chk["document_id"],
                    document_name=chk["document_name"],
                    section=chk["section"],
                    text=chk["text"],
                    retrieval_score=round(score, 4),
                    dense_score=round(d_score, 4) if d_score is not None else None,
                    lexical_score=round(l_score, 4),
                    is_canonical=chk.get("is_canonical", True),
                    version=chk.get("version"),
                    policy_category=chk.get("policy_category"),
                )
            )
            if len(candidates) >= top_k:
                break

        return candidates


hybrid_retriever = HybridRetriever()
