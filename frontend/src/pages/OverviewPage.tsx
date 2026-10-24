import React from 'react';
import {
  ShieldCheck,
  Play,
  Server,
  Layers,
  Cpu,
  Sparkles,
  ArrowRight,
  FlaskConical,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  History,
  FileText,
} from 'lucide-react';
import { StatusResponse, HistorySummaryItem } from '../types/api';
import { NavTab } from '../components/Sidebar';

interface Props {
  status: StatusResponse | null;
  history: HistorySummaryItem[];
  onStartAudit: (presetId?: string) => void;
  onNavigate: (tab: NavTab) => void;
}

export const OverviewPage: React.FC<Props> = ({
  status,
  history,
  onStartAudit,
  onNavigate,
}) => {
  const latestAudit = history.length > 0 ? history[0] : null;

  // Aggregate metrics across past session audits
  const totalAudits = history.length;
  const totalClaims = history.reduce((acc, h) => acc + h.total_claims, 0);
  const totalSupported = history.reduce((acc, h) => acc + h.supported_count, 0);
  const totalUnsupported = history.reduce((acc, h) => acc + h.unsupported_count, 0);
  const totalContradicted = history.reduce((acc, h) => acc + h.contradicted_count, 0);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fadeIn">
      {/* Hero Welcome Banner */}
      <div className="bg-gradient-to-r from-ink-950 via-ink-900 to-ink-850 border border-ink-800 rounded-2xl p-8 text-white relative overflow-hidden shadow-xl">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-brand-primary/20 text-cyan-300 border border-brand-primary/30 mb-4">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>AI Answer Verification & Observability Console</span>
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white mb-3">
            GroundCheck
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed mb-6 font-normal">
            GroundCheck doesn't just audit AI answers against configured corporate policies—it tests whether its own verifier catches controlled factual modifications to numbers, dates, scope, and negation.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onStartAudit('mandatory_acme_leave')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm bg-gradient-to-r from-brand-primary to-cyan-600 hover:from-indigo-600 hover:to-cyan-500 text-white shadow-md shadow-brand-primary/20 transition-all cursor-pointer"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Run Mandatory Acme Demo</span>
            </button>
            <button
              onClick={() => onNavigate('workspace')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm bg-ink-800/80 hover:bg-ink-700 text-slate-200 border border-ink-700 transition-all cursor-pointer"
            >
              <span>Custom Audit Workspace</span>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Ambient decorative accent */}
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-gradient-to-l from-cyan-600/10 via-brand-primary/10 to-transparent pointer-events-none" />
      </div>

      {/* System Readiness Cards */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">
            System & Engine Readiness
          </h3>
          <span className="text-xs text-slate-400">PRD Architecture Specification v2.0</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* API Server */}
          <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase">FastAPI Core</span>
              <Server className="w-4 h-4 text-brand-primary" />
            </div>
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${status?.api_ready ? 'bg-emerald-500' : 'bg-rose-500'}`} />
              <span className="text-base font-bold text-slate-800">
                {status?.api_ready ? 'Online & Healthy' : 'Offline'}
              </span>
            </div>
            <p className="text-2xs text-slate-400 mt-2">
              Local backend with Pydantic v2 validation contracts
            </p>
          </div>

          {/* Corpus Status */}
          <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase">Acme Corp Corpus</span>
              <Layers className="w-4 h-4 text-cyan-600" />
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-base font-bold text-slate-800">
                {status?.corpus_chunks_count || 8} Chunks Loaded
              </span>
            </div>
            <p className="text-2xs text-slate-400 mt-2">
              HR, IT Security, and Remote Work fictional policies
            </p>
          </div>

          {/* Retrieval Engine */}
          <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase">Hybrid Retrieval</span>
              <Cpu className="w-4 h-4 text-brand-primary" />
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-base font-bold text-slate-800">
                MiniLM + BM25
              </span>
            </div>
            <p className="text-2xs text-slate-400 mt-2">
              Dense vector similarity (0.65) fused with lexical BM25 (0.35)
            </p>
          </div>

          {/* NLI Verifier */}
          <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase">NLI Verifier</span>
              <Sparkles className="w-4 h-4 text-purple-600" />
            </div>
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${status?.nli_model_ready ? 'bg-emerald-500' : 'bg-cyan-500'}`} />
              <span className="text-base font-bold text-slate-800">
                {status?.nli_model_ready ? 'DeBERTa-v3 Live' : 'Deterministic / Rule'}
              </span>
            </div>
            <p className="text-2xs text-slate-400 mt-2">
              {status?.nli_model_ready
                ? 'Premise-hypothesis entailment classifier'
                : 'Deterministic guardrails active; live weights loading'}
            </p>
          </div>
        </div>
      </div>

      {/* Session Audit Metrics & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 cols: Status Distribution & Recent Audits */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status Distribution */}
          <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs">
            <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center justify-between">
              <span>Session Verification Statistics</span>
              <span className="text-xs font-normal text-slate-400">
                {totalAudits} audits executed
              </span>
            </h4>

            {totalClaims > 0 ? (
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-3 bg-emerald-50/60 border border-emerald-100 rounded-lg">
                  <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-emerald-800 mb-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Supported</span>
                  </div>
                  <span className="text-2xl font-bold font-mono text-emerald-700">
                    {totalSupported}
                  </span>
                  <span className="block text-2xs text-emerald-600 mt-0.5">
                    ({Math.round((totalSupported / totalClaims) * 100)}%)
                  </span>
                </div>

                <div className="p-3 bg-amber-50/60 border border-amber-100 rounded-lg">
                  <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-amber-800 mb-1">
                    <HelpCircle className="w-4 h-4 text-amber-600" />
                    <span>Unsupported</span>
                  </div>
                  <span className="text-2xl font-bold font-mono text-amber-700">
                    {totalUnsupported}
                  </span>
                  <span className="block text-2xs text-amber-600 mt-0.5">
                    ({Math.round((totalUnsupported / totalClaims) * 100)}%)
                  </span>
                </div>

                <div className="p-3 bg-rose-50/60 border border-rose-100 rounded-lg">
                  <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-rose-800 mb-1">
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                    <span>Contradicted</span>
                  </div>
                  <span className="text-2xl font-bold font-mono text-rose-700">
                    {totalContradicted}
                  </span>
                  <span className="block text-2xs text-rose-600 mt-0.5">
                    ({Math.round((totalContradicted / totalClaims) * 100)}%)
                  </span>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400 text-xs">
                <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p>No audit data recorded in this session yet.</p>
                <p className="text-2xs text-slate-400 mt-0.5">
                  Click 'Run Mandatory Acme Demo' above to populate real metrics.
                </p>
              </div>
            )}
          </div>

          {/* Recent Audits Table */}
          <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <History className="w-4 h-4 text-brand-primary" />
                <span>Recent Audits</span>
              </h4>
              <button
                onClick={() => onNavigate('history')}
                className="text-xs text-brand-primary font-medium hover:underline cursor-pointer"
              >
                View all
              </button>
            </div>

            {history.length > 0 ? (
              <div className="divide-y divide-slate-100 text-xs">
                {history.slice(0, 3).map((h) => (
                  <div key={h.audit_id} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-mono font-semibold text-slate-700">{h.audit_id}</span>
                        <span className="text-slate-300">•</span>
                        <span className="text-2xs font-mono text-slate-400">
                          {new Date(h.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-slate-600 truncate">{h.query_snippet}</p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <span className="font-mono font-bold text-slate-800">
                          {h.trust_score !== null ? `${h.trust_score.toFixed(1)}%` : 'N/A'}
                        </span>
                        <span className="block text-2xs text-slate-400">Trust</span>
                      </div>
                      <button
                        onClick={() => onNavigate('workspace')}
                        className="p-1 text-slate-400 hover:text-brand-primary cursor-pointer"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 text-center py-4">No prior audits found.</p>
            )}
          </div>
        </div>

        {/* Right col: Claim Mutation Lab feature spotlight */}
        <div className="bg-gradient-to-b from-slate-900 to-ink-950 text-white rounded-xl p-6 flex flex-col justify-between border border-slate-800 shadow-md">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm bg-cyan-900/60 text-cyan-300 border border-cyan-700/50 text-2xs font-semibold mb-3">
              <FlaskConical className="w-3.5 h-3.5" />
              <span>Core Differentiator</span>
            </div>
            <h4 className="text-base font-bold text-white mb-2">
              Claim Mutation Lab
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              A verifier that passes the original claim but fails to reject "20 days" when the policy strictly says "14 days" cannot be trusted in production.
            </p>

            <div className="space-y-2 text-2xs text-slate-300 mb-6">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                <span>Numerical Swaps (14d ↔ 20d)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                <span>Polarity & Negation Inversion</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                <span>Scope Shifts (full-time ↔ all staff)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                <span>Cadence & Period Alterations</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => onNavigate('mutation')}
            className="w-full py-2.5 px-4 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            <span>Open Mutation Lab</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
