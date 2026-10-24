import React, { useState } from 'react';
import {
  Play,
  Sparkles,
  ShieldCheck,
  Scissors,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Copy,
  Download,
  GitBranch,
  FlaskConical,
  Check,
  ChevronDown,
  Layers,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import {
  VerifyResponse,
  ClaimVerificationResult,
  SanitizeResponse,
  SanitizationPolicy,
  LineageGraph,
} from '../types/api';
import { DEMO_PRESETS, DemoPreset } from '../lib/presets';
import { MetricsStrip } from '../components/MetricsStrip';
import { StatusBadge } from '../components/StatusBadge';
import { EvidenceInspector } from '../components/EvidenceInspector';
import { LineageModal } from '../components/LineageModal';
import { api } from '../lib/api';

interface Props {
  currentAudit: VerifyResponse | null;
  onAuditComplete: (audit: VerifyResponse) => void;
  onOpenMutationLab: (claims: ClaimVerificationResult[]) => void;
  demoMode: boolean;
}

export const WorkspacePage: React.FC<Props> = ({
  currentAudit,
  onAuditComplete,
  onOpenMutationLab,
  demoMode,
}) => {
  // Preset & Form State
  const [selectedPresetId, setSelectedPresetId] = useState<string>('mandatory_acme_leave');
  const [query, setQuery] = useState<string>(
    DEMO_PRESETS[0].query
  );
  const [response, setResponse] = useState<string>(
    DEMO_PRESETS[0].response
  );
  const [topK, setTopK] = useState<number>(5);

  // Loading & Selection States
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sanitization State
  const [sanitizing, setSanitizing] = useState<boolean>(false);
  const [sanitizePolicy, setSanitizePolicy] = useState<SanitizationPolicy>('correct_from_canonical_source');
  const [sanitizationResult, setSanitizationResult] = useState<SanitizeResponse | null>(null);
  const [copiedSanitized, setCopiedSanitized] = useState<boolean>(false);

  // Lineage Modal State
  const [lineageOpen, setLineageOpen] = useState<boolean>(false);
  const [lineageGraph, setLineageGraph] = useState<LineageGraph | null>(null);
  const [loadingLineage, setLoadingLineage] = useState<boolean>(false);

  // Handle Preset Selection
  const handleSelectPreset = (preset: DemoPreset) => {
    setSelectedPresetId(preset.id);
    setQuery(preset.query);
    setResponse(preset.response);
    setSanitizationResult(null);
    setErrorMessage(null);
  };

  // Run Verification Audit
  const handleRunAudit = async () => {
    if (!query.trim() || !response.trim()) {
      setErrorMessage('Please provide both a question and an AI answer to audit.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setSanitizationResult(null);

    try {
      const res = await api.verify({
        query: query.trim(),
        response: response.trim(),
        corpus_id: 'acme_corporate_policies',
        top_k: topK,
        demo_mode: demoMode,
      });

      onAuditComplete(res);
      if (res.claims.length > 0) {
        setSelectedClaimId(res.claims[0].claim_id);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Verification audit failed. Ensure backend server is running.');
    } finally {
      setLoading(false);
    }
  };

  // Run Safe Sanitization
  const handleSanitize = async () => {
    if (!currentAudit) return;

    setSanitizing(true);
    setErrorMessage(null);

    try {
      const res = await api.sanitize({
        query,
        response,
        audit_id: currentAudit.audit_id,
        policy: sanitizePolicy,
        preserve_supported_claims: true,
        demo_mode: demoMode,
      });

      setSanitizationResult(res);
    } catch (err: any) {
      setErrorMessage(err.message || 'Sanitization failed.');
    } finally {
      setSanitizing(false);
    }
  };

  // Open Lineage Graph Modal
  const handleOpenLineage = async () => {
    if (!currentAudit) return;
    setLoadingLineage(true);
    try {
      const graph = await api.getLineage(currentAudit.audit_id);
      setLineageGraph(graph);
      setLineageOpen(true);
    } catch (err: any) {
      setErrorMessage(err.message || 'Could not load lineage graph.');
    } finally {
      setLoadingLineage(false);
    }
  };

  // Copy Sanitized Text
  const handleCopySanitized = () => {
    if (!sanitizationResult) return;
    navigator.clipboard.writeText(sanitizationResult.sanitized_response);
    setCopiedSanitized(true);
    setTimeout(() => setCopiedSanitized(false), 2000);
  };

  // Export JSON Report
  const handleExportJSON = () => {
    if (!currentAudit) return;
    const exportData = {
      audit: currentAudit,
      sanitization: sanitizationResult,
      exported_at: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `groundcheck-${currentAudit.audit_id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const selectedClaim =
    currentAudit?.claims.find((c) => c.claim_id === selectedClaimId) ||
    currentAudit?.claims[0] ||
    null;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 animate-fadeIn">
      {/* Top Presets Bar */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-brand-primary" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Demo Presets & Policy Benchmarks
            </h3>
          </div>
          <span className="text-2xs text-slate-400 font-mono">
            Corpus: Acme Corp 2026 HR & IT Policies
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {DEMO_PRESETS.map((p) => {
            const isSelected = selectedPresetId === p.id;
            return (
              <button
                key={p.id}
                onClick={() => handleSelectPreset(p)}
                className={`text-left p-2.5 rounded-lg border text-xs transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-brand-primary/10 border-brand-primary/50 ring-1 ring-brand-primary/40 font-medium'
                    : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100/70'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-slate-800 truncate">{p.name}</span>
                </div>
                <p className="text-2xs text-slate-500 line-clamp-2 leading-relaxed">
                  {p.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Audit Metrics Strip (when audit available) */}
      {currentAudit && (
        <MetricsStrip metrics={currentAudit.metrics} mode={currentAudit.engine_readiness} />
      )}

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (~56% -> 7 cols of 12) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Question & Answer Input Card */}
          <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs space-y-4">
            {/* Question Field */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Query / Question
                </label>
                <span className="text-2xs text-slate-400 font-mono">{query.length}/2000</span>
              </div>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. How many paid leaves do employees get?"
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary transition-all font-sans"
              />
            </div>

            {/* Answer Field */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Generated AI Answer to Audit
                </label>
                <span className="text-2xs text-slate-400 font-mono">{response.length}/20000</span>
              </div>
              <textarea
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                rows={3}
                placeholder="Enter or paste the AI answer to verify..."
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary transition-all font-sans"
              />
            </div>

            {/* Controls Bar: Top-K, Run Button */}
            <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100">
              <div className="flex items-center gap-3 text-xs text-slate-600">
                <span className="font-semibold text-slate-700">Top-K Evidence:</span>
                <select
                  value={topK}
                  onChange={(e) => setTopK(Number(e.target.value))}
                  className="px-2.5 py-1 text-xs bg-slate-100 border border-slate-200 rounded-md font-mono"
                >
                  <option value={3}>Top 3</option>
                  <option value={5}>Top 5 (Recommended)</option>
                  <option value={8}>Top 8</option>
                  <option value={10}>Top 10</option>
                </select>
              </div>

              <button
                onClick={handleRunAudit}
                disabled={loading}
                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-xs shadow-md transition-all cursor-pointer ${
                  loading
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                    : 'bg-brand-primary hover:bg-indigo-600 text-white shadow-brand-primary/25'
                }`}
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Auditing Claims & Evidence...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-white" />
                    <span>Run GroundCheck Audit</span>
                  </>
                )}
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}
          </div>

          {/* Claim Verification Results List */}
          {currentAudit && (
            <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    Extracted Factual Claims ({currentAudit.claims.length})
                  </h3>
                  <p className="text-2xs text-slate-400">
                    Atomic claims evaluated against canonical policy facts. Click any claim to inspect evidence.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onOpenMutationLab(currentAudit.claims)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-50 text-cyan-800 border border-cyan-200 hover:bg-cyan-100 transition-all cursor-pointer"
                    title="Stress-test this audit in the Claim Mutation Lab"
                  >
                    <FlaskConical className="w-3.5 h-3.5 text-cyan-600" />
                    <span>Stress-Test Claims</span>
                  </button>

                  <button
                    onClick={handleOpenLineage}
                    disabled={loadingLineage}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 transition-all cursor-pointer"
                    title="Open structured evidence lineage"
                  >
                    <GitBranch className="w-3.5 h-3.5 text-brand-primary" />
                    <span>Lineage</span>
                  </button>
                </div>
              </div>

              {/* Claims Stack */}
              <div className="space-y-3">
                {currentAudit.claims.map((claim) => {
                  const isSelected = selectedClaimId === claim.claim_id;
                  return (
                    <div
                      key={claim.claim_id}
                      onClick={() => setSelectedClaimId(claim.claim_id)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'border-brand-primary bg-indigo-50/20 ring-1 ring-brand-primary/30 shadow-xs'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-2xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-sm">
                            {claim.claim_id}
                          </span>
                          <StatusBadge status={claim.status} size="sm" />
                        </div>

                        <div className="flex items-center gap-1.5 text-2xs font-mono text-slate-500">
                          <span>Conf:</span>
                          <span className="font-bold text-slate-700">
                            {(claim.confidence_score * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>

                      <p className="text-sm font-medium text-slate-900 leading-snug mb-2">
                        "{claim.claim_text}"
                      </p>

                      <div className="text-xs text-slate-600 flex items-center justify-between pt-2 border-t border-slate-100">
                        <span className="truncate max-w-[80%] text-slate-500">
                          {claim.explanation}
                        </span>
                        {claim.chunk_id && (
                          <span className="font-mono text-2xs font-semibold text-cyan-700 bg-cyan-50 px-1.5 py-0.5 rounded-sm">
                            {claim.chunk_id}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Safe Sanitization & Independent Re-Verification Panel */}
          {currentAudit && (
            <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Scissors className="w-4 h-4 text-brand-primary" />
                  <h3 className="text-sm font-bold text-slate-800">
                    Safe Sanitization & Second-Pass Audit
                  </h3>
                </div>
                <span className="text-3xs uppercase tracking-wider font-bold px-2 py-0.5 rounded-sm bg-purple-50 text-purple-700 border border-purple-200">
                  PRD Section 7
                </span>
              </div>

              <p className="text-xs text-slate-500 leading-relaxed">
                Removes unsupported assertions or replaces contradicted facts with canonical source truths, then independently re-verifies the sanitized answer with a second verification audit.
              </p>

              {/* Policy Selection */}
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                  <input
                    type="radio"
                    name="policy"
                    checked={sanitizePolicy === 'correct_from_canonical_source'}
                    onChange={() => setSanitizePolicy('correct_from_canonical_source')}
                    className="text-brand-primary focus:ring-brand-primary"
                  />
                  <span>Correct from Canonical Source (Recommended)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                  <input
                    type="radio"
                    name="policy"
                    checked={sanitizePolicy === 'remove_unsafe'}
                    onChange={() => setSanitizePolicy('remove_unsafe')}
                    className="text-brand-primary focus:ring-brand-primary"
                  />
                  <span>Remove Unsafe Claims Only</span>
                </label>
              </div>

              <button
                onClick={handleSanitize}
                disabled={sanitizing}
                className="w-full py-2.5 px-4 rounded-xl font-semibold text-xs bg-slate-900 hover:bg-slate-800 text-white flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
              >
                {sanitizing ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Sanitizing & Re-Auditing Answer...</span>
                  </>
                ) : (
                  <>
                    <Scissors className="w-4 h-4" />
                    <span>Apply Sanitization & Run Second Audit</span>
                  </>
                )}
              </button>

              {/* Sanitization Results Output */}
              {sanitizationResult && (
                <div className="pt-4 border-t border-slate-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        Sanitized Source-Backed Answer
                      </span>
                      <span
                        className={`text-2xs font-bold px-2 py-0.5 rounded-full ${
                          sanitizationResult.fully_supported
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {sanitizationResult.fully_supported ? '100% FULLY SUPPORTED' : 'PARTIAL SUPPORT'}
                      </span>
                    </div>

                    <button
                      onClick={handleCopySanitized}
                      className="text-2xs text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
                    >
                      {copiedSanitized ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedSanitized ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>

                  <div className="p-3.5 bg-emerald-50/50 border border-emerald-200 rounded-lg text-xs leading-relaxed font-sans text-slate-900 font-medium">
                    "{sanitizationResult.sanitized_response}"
                  </div>

                  {/* Removals and Replacements breakdown */}
                  <div className="space-y-2 text-2xs">
                    {sanitizationResult.replaced_claims.map((r, i) => (
                      <div key={i} className="p-2 bg-blue-50/60 border border-blue-200 rounded-md text-blue-900 flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 mt-0.5 shrink-0" />
                        <div>
                          <span className="font-semibold">Replaced: </span>
                          <span className="line-through text-slate-500">"{r.original_claim}"</span>
                          <span className="font-semibold text-blue-700"> → "{r.replacement_claim}" </span>
                          <span className="font-mono text-3xs text-blue-600">({r.canonical_chunk_id})</span>
                        </div>
                      </div>
                    ))}

                    {sanitizationResult.removed_claims.map((rem, i) => (
                      <div key={i} className="p-2 bg-amber-50/60 border border-amber-200 rounded-md text-amber-900 flex items-start gap-2">
                        <Scissors className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
                        <div>
                          <span className="font-semibold">Removed Unsubstantiated Assertion: </span>
                          <span>"{rem}"</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Second-pass audit confirmation */}
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-2xs text-slate-600 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-slate-700">Independent Second-Pass Audit: </span>
                      <span className="font-mono font-bold text-emerald-700">
                        {sanitizationResult.final_audit.metrics.trust_score}% Trust
                      </span>
                      <span className="text-slate-400 ml-1">
                        ({sanitizationResult.final_audit.metrics.supported_count}/
                        {sanitizationResult.final_audit.metrics.total_claims} claims supported)
                      </span>
                    </div>
                    <span className="text-3xs font-mono text-slate-400">
                      Audit: {sanitizationResult.final_audit.audit_id}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Audit Export & Report Actions */}
          {currentAudit && (
            <div className="flex items-center justify-between pt-2">
              <span className="text-2xs text-slate-400 font-mono">
                Audit ID: {currentAudit.audit_id}
              </span>
              <button
                onClick={handleExportJSON}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 border border-slate-200 hover:bg-slate-100 transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Audit JSON</span>
              </button>
            </div>
          )}
        </div>

        {/* Right Column (~44% -> 5 cols of 12): Evidence Inspector */}
        <div className="lg:col-span-5 sticky top-6">
          <EvidenceInspector claim={selectedClaim} />
        </div>
      </div>

      {/* Lineage Modal */}
      <LineageModal
        isOpen={lineageOpen}
        onClose={() => setLineageOpen(false)}
        graph={lineageGraph}
        auditId={currentAudit?.audit_id || ''}
      />
    </div>
  );
};
