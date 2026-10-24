"""Embedding model manager and corpus embedding cache for GroundCheck.
Uses sentence-transformers/all-MiniLM-L6-v2.
"""
import logging
import threading
from typing import List, Optional
import numpy as np

from ..config import settings

logger = logging.getLogger(__name__)


class EmbeddingManager:
    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super(EmbeddingManager, cls).__new__(cls)
                cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if getattr(self, "_initialized", False):
            return
        self.model_name = settings.embedding_model_name
        self.device = settings.device
        self.model = None
        self.is_ready = False
        self.loading = False
        self.error: Optional[str] = None
        self._init_lock = threading.Lock()
        self._initialized = True

    def initialize(self) -> bool:
        """Initializes the embedding model in a thread-safe manner.
        """
        with self._init_lock:
            if self.is_ready:
                return True
            self.loading = True
            try:
                logger.info(f"Loading embedding model: {self.model_name} on {self.device}")
                from sentence_transformers import SentenceTransformer
                self.model = SentenceTransformer(self.model_name, device=self.device)
                self.is_ready = True
                self.error = None
                logger.info("Embedding model loaded successfully.")
                return True
            except Exception as e:
                self.is_ready = False
                self.error = str(e)
                logger.warning(f"Failed to load embedding model {self.model_name}: {e}")
                return False
            finally:
                self.loading = False

    def embed_texts(self, texts: List[str]) -> Optional[np.ndarray]:
        """Generates normalized vector embeddings for a list of texts if model is ready.
        """
        if not self.is_ready or self.model is None:
            return None

        try:
            embeddings = self.model.encode(texts, convert_to_numpy=True, normalize_embeddings=True)
            return embeddings
        except Exception as e:
            logger.error(f"Error generating embeddings: {e}")
            return None


embedding_manager = EmbeddingManager()
