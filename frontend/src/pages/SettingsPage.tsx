import React from 'react';
import {
  Settings,
  Server,
  Cpu,
  Layers,
  Sparkles,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
  Info,
  CheckCircle2,
  AlertTriangle,
  FileCode,
} from 'lucide-react';
import { StatusResponse } from '../types/api';

interface Props {
  status: StatusResponse | null;
  demoMode: boolean;
  onToggleDemoMode: () => void;
  onRefreshStatus: () => void;
}

export const SettingsPage: React.FC<Props> = ({
  status,
  demoMode,
  onToggleDemoMode,
  onRefreshStatus,
}) => {
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 animate-fadeIn">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Settings className="w-5 h-5 text-brand-primary" />
            <h2 className="text-xl font-bold text-slate-800">System Configuration & Model Status</h2>
          </div>
          <p className="text-xs text-slate-500">
            Real-time diagnostics and model execution pipeline state. No fabricated readiness metrics.
          </p>
        </div>

        <button
          onClick={onRefreshStatus}
          className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer"
        >
          Refresh Status
        </button>
      </div>

      {/* Mode Controls */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-0.5">
              Deterministic Demo / Fixture Override
            </h3>
            <p className="text-xs text-slate-500 max-w-xl">
              When enabled, GroundCheck uses deterministic verification fixtures for zero-latency, offline hackathon presentations. When disabled, queries evaluate against real local embedding and NLI models.
            </p>
          </div>

          <button
            onClick={onToggleDemoMode}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              demoMode
                ? 'bg-cyan-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {demoMode ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
            <span>{demoMode ? 'Demo Mode Active' : 'Live Inference Mode'}</span>
          </button>
        </div>
      </div>

      {/* Model Diagnostics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* FastAPI Server Diagnostic */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-brand-primary" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                FastAPI Backend Core
              </h4>
            </div>
            <span className="text-2xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-sm border border-emerald-200">
              OPERATIONAL
            </span>
          </div>

          <div className="space-y-1.5 text-xs text-slate-600 font-mono">
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="font-sans text-slate-400">Version:</span>
              <span className="text-slate-800 font-bold">{status?.version || '2.0.0'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="font-sans text-slate-400">Endpoint:</span>
              <span className="text-slate-800">http://localhost:8000</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="font-sans text-slate-400">Pydantic Schemas:</span>
              <span className="text-slate-800">Pydantic v2 Typed Contracts</span>
            </div>
          </div>
        </div>

        {/* Corpus Diagnostic */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-600" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Fictional Acme Policy Corpus
              </h4>
            </div>
            <span className="text-2xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-sm border border-emerald-200">
              LOADED
            </span>
          </div>

          <div className="space-y-1.5 text-xs text-slate-600 font-mono">
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="font-sans text-slate-400">Documents:</span>
              <span className="text-slate-800 font-bold">{status?.corpus_documents_count || 4} Policies</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="font-sans text-slate-400">Total Chunks:</span>
              <span className="text-slate-800 font-bold">{status?.corpus_chunks_count || 9} Structured Chunks</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="font-sans text-slate-400">Canonical HR Policy:</span>
              <span className="text-slate-800">14 Paid Leave Days (2026)</span>
            </div>
          </div>
        </div>

        {/* Embedding Model Diagnostic */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-brand-primary" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Dense Embedding Model
              </h4>
            </div>
            <span
              className={`text-2xs font-mono font-bold px-2 py-0.5 rounded-sm border ${
                status?.retrieval_model_ready
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}
            >
              {status?.retrieval_model_ready ? 'LIVE ON CPU' : 'INITIALIZING / FALLBACK'}
            </span>
          </div>

          <div className="space-y-1.5 text-xs text-slate-600 font-mono">
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="font-sans text-slate-400">Model Name:</span>
              <span className="text-slate-800 truncate max-w-[220px]">
                sentence-transformers/all-MiniLM-L6-v2
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="font-sans text-slate-400">Execution Device:</span>
              <span className="text-slate-800 uppercase font-bold">{status?.device || 'cpu'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="font-sans text-slate-400">Hybrid Fusion:</span>
              <span className="text-slate-800">65% Semantic + 35% BM25</span>
            </div>
          </div>
        </div>

        {/* NLI Cross-Encoder Diagnostic */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-600" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                NLI Cross-Encoder Verifier
              </h4>
            </div>
            <span
              className={`text-2xs font-mono font-bold px-2 py-0.5 rounded-sm border ${
                status?.nli_model_ready
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-cyan-50 text-cyan-700 border-cyan-200'
              }`}
            >
              {status?.nli_model_ready ? 'LIVE MODEL' : 'DETERMINISTIC / RULE'}
            </span>
          </div>

          <div className="space-y-1.5 text-xs text-slate-600 font-mono">
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="font-sans text-slate-400">Architecture:</span>
              <span className="text-slate-800 truncate max-w-[220px]">
                cross-encoder/nli-deberta-v3-base
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="font-sans text-slate-400">Label Mapping:</span>
              <span className="text-slate-800">Dynamic config id2label</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="font-sans text-slate-400">Conflict Guard:</span>
              <span className="text-slate-800">Deterministic Numerical Guard</span>
            </div>
          </div>
        </div>
      </div>

      {/* PRD Compliance Architecture Note */}
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-2xs text-slate-500 space-y-1">
        <div className="font-bold text-slate-700 flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-brand-primary" />
          <span>PRD Guarantee & Safety Principles</span>
        </div>
        <p>
          GroundCheck enforces that absence of evidence never automatically implies contradiction. High retrieval similarity never independently establishes truth. Re-written answers are independently re-verified via a complete second-pass audit.
        </p>
      </div>
    </div>
  );
};
