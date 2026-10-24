import React, { useState } from 'react';
import {
  FileText,
  Bookmark,
  Layers,
  Sparkles,
  ChevronRight,
  ExternalLink,
  ShieldAlert,
  CheckCircle,
  HelpCircle,
  Info,
} from 'lucide-react';
import { ClaimVerificationResult, EvidenceCandidate } from '../types/api';

interface Props {
  claim: ClaimVerificationResult | null;
  onSelectCandidate?: (candidate: EvidenceCandidate) => void;
}

export const EvidenceInspector: React.FC<Props> = ({ claim }) => {
  const [selectedCandidateIndex, setSelectedCandidateIndex] = useState<number>(0);

  if (!claim) {
    return (
      <div className="bg-white border border-slate-200/80 rounded-xl shadow-xs p-8 text-center flex flex-col items-center justify-center min-h-[460px] text-slate-400">
        <Layers className="w-12 h-12 text-slate-300 mb-3 stroke-[1.5]" />
        <h4 className="text-base font-semibold text-slate-700 mb-1">No Claim Selected</h4>
        <p className="text-sm max-w-xs text-slate-500">
          Click any claim from the audit list on the left to inspect its retrieved evidence, provenance, NLI scores, and fact guards.
        </p>
      </div>
    );
  }

  const candidates = claim.evidence_candidates || [];
  const activeCandidate = candidates[selectedCandidateIndex] || null;

  // Active candidate text and metadata
  const chunkText = activeCandidate?.text || claim.matching_source_snippet;
  const chunkId = activeCandidate?.chunk_id || claim.chunk_id;
  const docName = activeCandidate?.document_name || claim.document_name;
  const docId = activeCandidate?.document_id || claim.document_id;
  const section = activeCandidate?.section || claim.source_location?.section;
  const page = claim.source_location?.page;
  const lineStart = claim.source_location?.line_start;
  const lineEnd = claim.source_location?.line_end;

  const nli = activeCandidate?.nli_scores || claim.nli_scores;

  return (
    <div className="bg-white border border-slate-200/80 rounded-xl shadow-xs flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-brand-primary" />
          <h3 className="text-sm font-semibold text-slate-800">Evidence Inspector</h3>
        </div>
        <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-sm bg-slate-200/70 text-slate-700">
          {claim.claim_id}
        </span>
      </div>

      <div className="p-5 flex-1 overflow-y-auto space-y-5">
        {/* Claim context summary */}
        <div className="bg-slate-50 border border-slate-200/70 rounded-lg p-3.5">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Claim Under Audit
          </div>
          <p className="text-sm font-medium text-slate-900 leading-snug">
            "{claim.claim_text}"
          </p>
          <div className="mt-2.5 pt-2 border-t border-slate-200/50 flex flex-wrap items-center gap-4 text-xs text-slate-500">
            <div>
              <span className="font-semibold text-slate-700">Status: </span>
              <span className="font-semibold">{claim.status}</span>
            </div>
            <div>
              <span className="font-semibold text-slate-700">Model Confidence: </span>
              <span className="font-mono text-slate-800">
                {(claim.confidence_score * 100).toFixed(1)}%
              </span>
              <span className="text-2xs text-slate-400 ml-1">(Decision confidence, not probability of truth)</span>
            </div>
          </div>
        </div>

        {/* Primary Evidence Passage */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Bookmark className="w-3.5 h-3.5 text-cyan-600" />
              Retrieved Source Passage
            </span>
            {chunkId && (
              <span className="text-2xs font-mono px-2 py-0.5 rounded-md bg-cyan-50 text-cyan-800 border border-cyan-200 font-semibold">
                {chunkId}
              </span>
            )}
          </div>

          {chunkText ? (
            <div className="bg-slate-900 text-slate-100 rounded-lg p-4 font-mono text-xs leading-relaxed border border-slate-800 relative group shadow-inner">
              <p className="text-slate-200 whitespace-pre-wrap">{chunkText}</p>
              <div className="mt-3 pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-2xs text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="text-cyan-400 font-sans font-medium">{docName}</span>
                  {section && <span className="text-slate-400 font-sans">({section})</span>}
                </div>
                {(page || lineStart) && (
                  <span className="text-slate-400">
                    {page ? `p. ${page}` : ''} {lineStart ? `lines ${lineStart}-${lineEnd}` : ''}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-amber-50/60 border border-amber-200 rounded-lg p-4 text-center">
              <HelpCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
              <p className="text-xs font-semibold text-amber-800 mb-1">
                No Supporting or Conflicting Passage Found
              </p>
              <p className="text-2xs text-amber-700">
                The corpus does not contain applicable factual records substantiating this proposition. Absence of evidence does not imply contradiction.
              </p>
            </div>
          )}
        </div>

        {/* Fact Guard / Canonical Verification */}
        {claim.fact_guard && claim.fact_guard.checked && (
          <div className="border border-slate-200 rounded-lg p-3.5 bg-white">
            <div className="flex items-center gap-2 mb-2">
              <ShieldAlert className={`w-4 h-4 ${claim.fact_guard.conflict_detected ? 'text-rose-600' : 'text-emerald-600'}`} />
              <span className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
                Deterministic Policy & Fact Guard
              </span>
              <span className={`text-2xs font-bold px-1.5 py-0.5 rounded-sm ${
                claim.fact_guard.conflict_detected ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
              }`}>
                {claim.fact_guard.conflict_detected ? 'CONTRADICTION DETECTED' : 'FACT GUARD PASSED'}
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-2.5">
              {claim.fact_guard.reason}
            </p>

            {claim.fact_guard.detected_facts && (
              <div className="bg-slate-50 p-2.5 rounded-md border border-slate-100 text-2xs space-y-1 font-mono text-slate-700">
                <div>
                  <span className="font-semibold text-slate-500">Extracted Fact: </span>
                  {JSON.stringify(claim.fact_guard.detected_facts)}
                </div>
                {claim.fact_guard.canonical_match && (
                  <div>
                    <span className="font-semibold text-emerald-600">Canonical Baseline: </span>
                    {JSON.stringify(claim.fact_guard.canonical_match)}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* NLI Probabilities & Retrieval Breakdown */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* NLI Scores */}
          <div className="border border-slate-200 rounded-lg p-3 bg-white">
            <div className="text-xs font-semibold text-slate-700 mb-2 flex items-center justify-between">
              <span>NLI Classification</span>
              <Sparkles className="w-3.5 h-3.5 text-brand-primary" />
            </div>
            {nli ? (
              <div className="space-y-1.5 text-xs">
                <div>
                  <div className="flex justify-between text-2xs mb-0.5">
                    <span className="font-medium text-emerald-700">Entailment</span>
                    <span className="font-mono text-slate-600">{(nli.entailment * 100).toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all"
                      style={{ width: `${Math.round(nli.entailment * 100)}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-2xs mb-0.5">
                    <span className="font-medium text-amber-700">Neutral / Insufficient</span>
                    <span className="font-mono text-slate-600">{(nli.neutral * 100).toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-amber-500 h-full rounded-full transition-all"
                      style={{ width: `${Math.round(nli.neutral * 100)}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-2xs mb-0.5">
                    <span className="font-medium text-rose-700">Contradiction</span>
                    <span className="font-mono text-slate-600">{(nli.contradiction * 100).toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-rose-500 h-full rounded-full transition-all"
                      style={{ width: `${Math.round(nli.contradiction * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-2xs text-slate-400 italic">NLI inference ran in rule/guardrail mode.</p>
            )}
          </div>

          {/* Retrieval Breakdown */}
          <div className="border border-slate-200 rounded-lg p-3 bg-white">
            <div className="text-xs font-semibold text-slate-700 mb-2 flex items-center justify-between">
              <span>Hybrid Retrieval Score</span>
              <Layers className="w-3.5 h-3.5 text-cyan-600" />
            </div>
            <div className="space-y-1.5 text-2xs font-mono">
              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-slate-500 font-sans">Combined Hybrid:</span>
                <span className="font-bold text-slate-800">
                  {activeCandidate ? activeCandidate.retrieval_score.toFixed(4) : claim.retrieval_score.toFixed(4)}
                </span>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="text-slate-500 font-sans">Dense Semantic (all-MiniLM-L6):</span>
                <span className="text-slate-700">
                  {activeCandidate?.dense_score !== null && activeCandidate?.dense_score !== undefined
                    ? activeCandidate.dense_score.toFixed(4)
                    : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="text-slate-500 font-sans">Lexical BM25:</span>
                <span className="text-slate-700">
                  {activeCandidate?.lexical_score !== null && activeCandidate?.lexical_score !== undefined
                    ? activeCandidate.lexical_score.toFixed(4)
                    : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Competing Evidence Candidates */}
        {candidates.length > 1 && (
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
              <span>Candidate Passages Evaluated ({candidates.length})</span>
            </div>
            <div className="space-y-1.5">
              {candidates.map((cand, idx) => (
                <button
                  key={cand.chunk_id}
                  onClick={() => setSelectedCandidateIndex(idx)}
                  className={`w-full text-left p-2.5 rounded-lg border text-xs transition-all flex items-start justify-between gap-2 ${
                    idx === selectedCandidateIndex
                      ? 'bg-cyan-50/50 border-cyan-300 ring-1 ring-cyan-200'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-mono font-semibold text-slate-700">{cand.chunk_id}</span>
                      <span className="text-slate-400">•</span>
                      <span className="text-slate-500 truncate font-sans">{cand.section}</span>
                    </div>
                    <p className="text-2xs text-slate-600 line-clamp-2 leading-relaxed">
                      {cand.text}
                    </p>
                  </div>
                  <div className="flex flex-col items-end shrink-0 text-2xs">
                    <span className="font-mono font-semibold text-cyan-800">
                      Score: {cand.retrieval_score.toFixed(3)}
                    </span>
                    {cand.is_canonical && (
                      <span className="text-3xs text-emerald-700 font-sans font-medium mt-0.5">
                        Canonical
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
