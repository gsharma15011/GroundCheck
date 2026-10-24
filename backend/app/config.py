"""Configuration settings for GroundCheck backend.
"""
import os
from pydantic import BaseModel, Field
from typing import List


class Settings(BaseModel):
    app_name: str = "GroundCheck"
    app_version: str = "2.0.0"
    api_prefix: str = "/api"
    
    # Retrieval & Models
    embedding_model_name: str = "sentence-transformers/all-MiniLM-L6-v2"
    nli_model_name: str = "cross-encoder/nli-deberta-v3-base"
    device: str = "cpu"
    
    # Hybrid retrieval weight: 0.65 dense semantic + 0.35 lexical BM25
    dense_retrieval_weight: float = 0.65
    lexical_retrieval_weight: float = 0.35
    
    # Bounds & constraints
    max_query_chars: int = 2000
    max_response_chars: int = 20000
    default_top_k: int = 5
    max_top_k: int = 10
    max_mutation_cases: int = 20
    
    # CORS
    cors_origins: List[str] = Field(
        default_factory=lambda: [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:4173",
            "http://127.0.0.1:4173",
            "http://localhost:3000",
        ]
    )
    
    # Max local history entries
    max_history_entries: int = 50


settings = Settings()
