import React, { useState } from 'react';
import {
  History,
  Trash2,
  Search,
  ArrowRight,
  ShieldCheck,
  Scissors,
  CheckCircle2,
  Clock,
  RotateCcw,
} from 'lucide-react';
import { HistorySummaryItem, VerifyResponse } from '../types/api';
import { api } from '../lib/api';

interface Props {
  history: HistorySummaryItem[];
  onRestoreAudit: (audit: VerifyResponse) => void;
  onRefreshHistory: () => void;
}

export const HistoryPage: React.FC<Props> = ({
  history,
  onRestoreAudit,
  onRefreshHistory,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [deleting, setDeleting] = useState<boolean>(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const handleClearHistory = async () => {
    if (!window.confirm('Are you sure you want to clear the local session audit history?')) {
      return;
    }
    setDeleting(true);
    try {
      await api.clearHistory();
      onRefreshHistory();
    } catch (err) {
      console.error('Failed to clear history', err);
    } finally {
      setDeleting(false);
    }
  };

  const handleRestore = async (auditId: string) => {
    setRestoringId(auditId);
    try {
      const fullAudit = await api.getSingleAudit(auditId);
      if (fullAudit && fullAudit.audit) {
        onRestoreAudit(fullAudit.audit);
      }
    } catch (err) {
      console.error('Failed to restore audit', err);
    } finally {
      setRestoringId(null);
    }
  };

  const filteredHistory = history.filter((h) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      h.query_snippet.toLowerCase().includes(term) ||
      h.audit_id.toLowerCase().includes(term) ||
      h.mode.toLowerCase().includes(term)
    );
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 animate-fadeIn">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <History className="w-5 h-5 text-brand-primary" />
            <h2 className="text-xl font-bold text-slate-800">Local Session Audit History</h2>
          </div>
          <p className="text-xs text-slate-500">
            Bounded in-memory session history (max 50 audits). Reopening an item restores its extracted claims, scores, and evidence candidates to the workspace.
          </p>
        </div>

        {history.length > 0 && (
          <button
            onClick={handleClearHistory}
            disabled={deleting}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition-all cursor-pointer"
          >
            <Trash2 className="w-4 h-4 text-rose-600" />
            <span>Clear History</span>
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search prior audits by question or audit ID..."
          className="w-full pl-9 pr-4 py-2.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary font-sans shadow-xs"
        />
      </div>

      {/* History List */}
      <div className="space-y-3">
        {filteredHistory.length > 0 ? (
          filteredHistory.map((item) => (
            <div
              key={item.audit_id}
              className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs hover:border-slate-300 transition-all flex flex-wrap items-center justify-between gap-4"
            >
              <div className="space-y-1.5 max-w-xl">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-xs text-slate-700 bg-slate-100 px-2 py-0.5 rounded-sm">
                    {item.audit_id}
                  </span>
                  <span className="text-2xs text-slate-400 font-mono flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(item.timestamp).toLocaleString()}
                  </span>
                  <span className="text-3xs uppercase font-bold px-1.5 py-0.5 rounded-sm bg-slate-100 text-slate-600 border border-slate-200">
                    {item.mode}
                  </span>
                  {item.sanitized && (
                    <span className="text-3xs font-bold px-1.5 py-0.5 rounded-sm bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-0.5">
                      <Scissors className="w-2.5 h-2.5" />
                      Sanitized
                    </span>
                  )}
                </div>

                <p className="text-sm font-semibold text-slate-800 line-clamp-1">
                  "{item.query_snippet}"
                </p>

                <div className="flex items-center gap-3 text-2xs text-slate-500 font-mono">
                  <span>Total Claims: <strong className="text-slate-700">{item.total_claims}</strong></span>
                  <span className="text-emerald-700">Supported: <strong>{item.supported_count}</strong></span>
                  <span className="text-amber-700">Unsupported: <strong>{item.unsupported_count}</strong></span>
                  <span className="text-rose-700">Contradicted: <strong>{item.contradicted_count}</strong></span>
                </div>
              </div>

              {/* Trust Score & Restore Action */}
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-0.5">
                    Trust Score
                  </span>
                  <span className="text-2xl font-bold font-mono text-slate-800">
                    {item.trust_score !== null && item.trust_score !== undefined
                      ? `${item.trust_score.toFixed(1)}%`
                      : 'N/A'}
                  </span>
                </div>

                <button
                  onClick={() => handleRestore(item.audit_id)}
                  disabled={restoringId === item.audit_id}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-brand-primary/10 text-brand-primary border border-brand-primary/30 hover:bg-brand-primary hover:text-white transition-all cursor-pointer"
                >
                  {restoringId === item.audit_id ? (
                    <span>Restoring...</span>
                  ) : (
                    <>
                      <span>Open Audit</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-400 text-xs">
            <History className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h4 className="text-sm font-semibold text-slate-700 mb-1">No Audit History Recorded</h4>
            <p className="max-w-xs mx-auto text-slate-400">
              Audits conducted during this session will be indexed here with their metrics and restoration checkpoints.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
