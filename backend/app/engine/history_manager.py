"""Session audit history manager for GroundCheck.
Stores bounded local audit history with restore and deletion capabilities.
"""
import threading
from datetime import datetime, timezone
from typing import List, Dict, Optional, Any

from ..schemas import HistorySummaryItem, VerifyResponse, SanitizeResponse
from ..config import settings


class HistoryManager:
    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super(HistoryManager, cls).__new__(cls)
                cls._instance.audits: Dict[str, Dict[str, Any]] = {}
                cls._instance.order: List[str] = []
        return cls._instance

    def save_audit(
        self,
        audit: VerifyResponse,
        sanitization: Optional[SanitizeResponse] = None,
    ) -> None:
        with self._lock:
            now_iso = datetime.now(timezone.utc).isoformat()
            entry = {
                "audit_id": audit.audit_id,
                "timestamp": now_iso,
                "query": audit.query,
                "raw_response": audit.raw_response,
                "audit": audit.model_dump(),
                "sanitization": sanitization.model_dump() if sanitization else None,
            }

            if audit.audit_id in self.audits:
                self.order.remove(audit.audit_id)
            self.audits[audit.audit_id] = entry
            self.order.insert(0, audit.audit_id)

            # Enforce max limit
            while len(self.order) > settings.max_history_entries:
                oldest_id = self.order.pop()
                if oldest_id in self.audits:
                    del self.audits[oldest_id]

    def get_summaries(self) -> List[HistorySummaryItem]:
        with self._lock:
            summaries = []
            for audit_id in self.order:
                entry = self.audits.get(audit_id)
                if not entry:
                    continue
                audit_data = entry["audit"]
                metrics = audit_data.get("metrics", {})
                sanit = entry.get("sanitization")

                summaries.append(
                    HistorySummaryItem(
                        audit_id=audit_id,
                        timestamp=entry["timestamp"],
                        query_snippet=(entry["query"][:60] + "...") if len(entry["query"]) > 60 else entry["query"],
                        mode=audit_data.get("engine_readiness", "LIVE"),
                        trust_score=metrics.get("trust_score"),
                        total_claims=metrics.get("total_claims", 0),
                        supported_count=metrics.get("supported_count", 0),
                        unsupported_count=metrics.get("unsupported_count", 0),
                        contradicted_count=metrics.get("contradicted_count", 0),
                        review_count=metrics.get("review_count", 0),
                        sanitized=sanit is not None,
                        fully_supported=sanit.get("fully_supported") if sanit else None,
                    )
                )
            return summaries

    def get_audit(self, audit_id: str) -> Optional[Dict[str, Any]]:
        with self._lock:
            return self.audits.get(audit_id)

    def clear_history(self) -> None:
        with self._lock:
            self.audits.clear()
            self.order.clear()


history_manager = HistoryManager()
