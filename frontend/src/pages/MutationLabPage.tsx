import React, { useState, useEffect } from 'react';
import {
  FlaskConical,
  Play,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  MinusCircle,
  Download,
  Info,
  Layers,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import {
  ClaimVerificationResult,
  MutationSuiteResponse,
  MutationCaseResult,
  MutationOutcome,
} from '../types/api';
import { api } from '../lib/api';

interface Props {
  claimsFromWorkspace: ClaimVerificationResult[];
  demoMode: boolean;
}

export const MutationLabPage: React.FC<Props> = ({ claimsFromWorkspace, demoMode }) => {
  const [suite, setSuite] = useState<MutationSuiteResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Selected mutation families
  const [selectedFamilies, setSelectedFamilies] = useState<string[]>([
    'numeric_swap',
    'negation_flip',
    'scope_shift',
    'date_period_shift',
    'qualifier_change',
  ]);

  // Filters for test cases table
  const [filterOutcome, setFilterOutcome] = useState<string>('ALL');
  const [filterFamily, setFilterFamily] = useState<string>('ALL');

  // Selected test case detail modal
  const [inspectedCase, setInspectedCase] = useState<MutationCaseResult | null>(null);

  // Default demo claims if workspace doesn't have an audit yet
  const defaultClaims: ClaimVerificationResult[] = [
    {
      claim_id: 'CLM-001',
      claim_text: 'According to Acme Policy, eligible full-time employees receive 14 paid leave days per calendar year.',
      status: 'SUPPORTED',
      confidence_score: 0.96,
      chunk_id: 'CHK-HR-001',
      document_id: 'DOC-HR-2026',
      document_name: 'Acme Corp 2026 HR Policy',
      retrieval_score: 0.92,
      explanation: 'Supported by Section 2.1 of Acme Corp 2026 HR Policy.',
      evidence_candidates: [],
    },
    {
      claim_id: 'CLM-002',
      claim_text: 'Annual leave requests require reporting-manager approval at least 5 business days prior to scheduled time off.',
      status: 'SUPPORTED',
      confidence_score: 0.94,
      chunk_id: 'CHK-HR-002',
      document_id: 'DOC-HR-2026',
      document_name: 'Acme Corp 2026 HR Policy',
      retrieval_score: 0.89,
      explanation: 'Supported by Section 2.3 of Acme Corp 2026 HR Policy.',
      evidence_candidates: [],
    },
  ];

  const claimsToRun = claimsFromWorkspace.length > 0 ? claimsFromWorkspace : defaultClaims;

  const handleRunSuite = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.mutationTests({
        claims: claimsToRun,
        mutation_families: selectedFamilies,
        max_cases: 20,
        demo_mode: demoMode,
      });
      setSuite(res);
    } catch (err: any) {
      setError(err.message || 'Mutation test run failed.');
    } finally {
      setLoading(false);
    }
  };

  // Auto-run once on initial load for instant evaluation
  useEffect(() => {
    if (!suite && !loading) {
      handleRunSuite();
    }
  }, []);

  const toggleFamily = (fam: string) => {
    if (selectedFamilies.includes(fam)) {
      if (selectedFamilies.length > 1) {
        setSelectedFamilies(selectedFamilies.filter((f) => f !== fam));
      }
    } else {
      setSelectedFamilies([...selectedFamilies, fam]);
    }
  };

  // Filter test cases
  const filteredCases = (suite?.cases || []).filter((c) => {
    if (filterOutcome !== 'ALL' && c.pass_fail_abstain !== filterOutcome) return false;
    if (filterFamily !== 'ALL' && c.mutation_family !== filterFamily) return false;
    return true;
  });

  const getOutcomeBadge = (outcome: MutationOutcome | string) => {
    switch (outcome) {
      case 'PASS':
        return (
          <span className="inline-flex items-center gap-1 text-2xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>PASS</span>
          </span>
        );
      case 'FAIL':
        return (
          <span className="inline-flex items-center gap-1 text-2xs font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
            <XCircle className="w-3 h-3 text-rose-600" />
            <span>FAIL</span>
          </span>
        );
      case 'ABSTAIN':
        return (
          <span className="inline-flex items-center gap-1 text-2xs font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
            <AlertTriangle className="w-3 h-3 text-purple-600" />
            <span>ABSTAIN</span>
          </span>
        );
      case 'SKIPPED':
      default:
        return (
          <span className="inline-flex items-center gap-1 text-2xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
            <MinusCircle className="w-3 h-3 text-slate-400" />
            <span>SKIPPED</span>
          </span>
        );
    }
  };

  const handleExportSuite = () => {
    if (!suite) return;
    const blob = new Blob([JSON.stringify(suite, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `groundcheck-mutation-${suite.suite_id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 animate-fadeIn">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-ink-950 via-ink-900 to-slate-900 border border-ink-800 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-2xs font-semibold bg-cyan-900/60 text-cyan-300 border border-cyan-700/60 mb-2">
              <FlaskConical className="w-3.5 h-3.5" />
              <span>Core Product Differentiator (PRD Section 2)</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white mb-2">
              Claim Mutation Lab
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed font-normal">
              Stress-tests the verification pipeline by injecting controlled, source-grounded modifications into factual claims. Checks if the verifier correctly switches its verdict or abstains.
            </p>
          </div>

          <button
            onClick={handleRunSuite}
            disabled={loading}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-xs bg-cyan-600 hover:bg-cyan-500 text-white shadow-md shadow-cyan-600/30 transition-all cursor-pointer"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Running Test Suite...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                <span>Execute Mutation Suite</span>
              </>
            )}
          </button>
        </div>

        {/* Mutation Family Toggles */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-400 mr-2">Mutation Families:</span>
          {[
            { id: 'numeric_swap', label: 'Numeric Swap (14 ↔ 20)' },
            { id: 'negation_flip', label: 'Negation / Polarity Flip' },
            { id: 'scope_shift', label: 'Eligibility Scope Shift' },
            { id: 'date_period_shift', label: 'Cadence / Date Shift' },
            { id: 'qualifier_change', label: 'Qualifier Change (may ↔ must)' },
          ].map((fam) => {
            const isChecked = selectedFamilies.includes(fam.id);
            return (
              <button
                key={fam.id}
                onClick={() => toggleFamily(fam.id)}
                className={`text-2xs font-medium px-3 py-1 rounded-md border transition-all cursor-pointer ${
                  isChecked
                    ? 'bg-cyan-950 text-cyan-200 border-cyan-700/80'
                    : 'bg-ink-850 text-slate-400 border-ink-700 hover:text-slate-200'
                }`}
              >
                {isChecked ? '✓ ' : '+ '}
                {fam.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Robustness Score Banner (Separate from Answer Trust Score) */}
      {suite && (
        <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Mutation Robustness Score
                </span>
                <span className="text-3xs font-bold px-2 py-0.5 rounded-sm bg-purple-50 text-purple-700 border border-purple-200">
                  Generated Test Set Only
                </span>
              </div>
              <p className="text-2xs text-slate-400">
                Correctly flagged applicable mutations / applicable mutations evaluated. Excludes skipped cases from denominator.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-3xl font-black font-mono text-cyan-700">
                {suite.robustness_score !== null ? `${suite.robustness_score.toFixed(1)}%` : 'N/A'}
              </span>
              <div className="text-2xs text-slate-500 text-right font-mono">
                <div>Numerator: <span className="font-bold text-slate-700">{suite.passed}</span></div>
                <div>Denominator: <span className="font-bold text-slate-700">{suite.evaluated_count}</span></div>
              </div>
            </div>
          </div>

          {/* Breakdown Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-100">
              <span className="text-xs font-semibold text-emerald-800 block mb-0.5">Passed Tests</span>
              <span className="text-xl font-bold font-mono text-emerald-700">{suite.passed}</span>
            </div>

            <div className="p-3 rounded-lg bg-rose-50 border border-rose-100">
              <span className="text-xs font-semibold text-rose-800 block mb-0.5">Failed Tests</span>
              <span className="text-xl font-bold font-mono text-rose-700">{suite.failed}</span>
            </div>

            <div className="p-3 rounded-lg bg-purple-50 border border-purple-100">
              <span className="text-xs font-semibold text-purple-800 block mb-0.5">Abstained</span>
              <span className="text-xl font-bold font-mono text-purple-700">{suite.abstained}</span>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-xs font-semibold text-slate-700 block mb-0.5">Skipped (Ineligible)</span>
              <span className="text-xl font-bold font-mono text-slate-700">{suite.skipped}</span>
            </div>

            <div className="p-3 rounded-lg bg-cyan-50 border border-cyan-100">
              <span className="text-xs font-semibold text-cyan-800 block mb-0.5">Test Coverage</span>
              <span className="text-xl font-bold font-mono text-cyan-700">
                {Math.round(suite.coverage * 100)}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Filter Bar & Test Cases Matrix */}
      {suite && (
        <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-bold text-slate-800">
                Generated Test Cases ({filteredCases.length})
              </h3>

              {/* Outcome filter */}
              <select
                value={filterOutcome}
                onChange={(e) => setFilterOutcome(e.target.value)}
                className="text-xs px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-md font-sans text-slate-700"
              >
                <option value="ALL">All Outcomes</option>
                <option value="PASS">Passed Only</option>
                <option value="FAIL">Failed Only</option>
                <option value="SKIPPED">Skipped Only</option>
              </select>

              {/* Family filter */}
              <select
                value={filterFamily}
                onChange={(e) => setFilterFamily(e.target.value)}
                className="text-xs px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-md font-sans text-slate-700"
              >
                <option value="ALL">All Families</option>
                <option value="numeric_swap">Numeric Swap</option>
                <option value="negation_flip">Negation Flip</option>
                <option value="scope_shift">Scope Shift</option>
                <option value="date_period_shift">Date/Period Shift</option>
                <option value="qualifier_change">Qualifier Change</option>
              </select>
            </div>

            <button
              onClick={handleExportSuite}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 border border-slate-200 hover:bg-slate-50 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Suite JSON</span>
            </button>
          </div>

          {/* Test Cases Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider text-3xs font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Test ID</th>
                  <th className="py-2.5 px-3">Family</th>
                  <th className="py-2.5 px-3">Mutated Test Variant</th>
                  <th className="py-2.5 px-3">Expected</th>
                  <th className="py-2.5 px-3">Actual</th>
                  <th className="py-2.5 px-3">Outcome</th>
                  <th className="py-2.5 px-3">Latency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCases.map((c) => (
                  <tr
                    key={c.test_id}
                    onClick={() => setInspectedCase(c)}
                    className="hover:bg-slate-50/70 transition-colors cursor-pointer group"
                  >
                    <td className="py-3 px-3 font-mono font-semibold text-slate-700 whitespace-nowrap">
                      {c.test_id}
                    </td>
                    <td className="py-3 px-3 font-medium text-slate-600 capitalize whitespace-nowrap">
                      {c.mutation_family.replace('_', ' ')}
                    </td>
                    <td className="py-3 px-3 font-mono text-2xs text-slate-900 max-w-md">
                      <span className="font-sans line-clamp-1 group-hover:text-cyan-800">
                        {c.mutated_text}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-slate-700 whitespace-nowrap">
                      {c.expected_status}
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-slate-700 whitespace-nowrap">
                      {c.actual_status}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      {getOutcomeBadge(c.pass_fail_abstain)}
                    </td>
                    <td className="py-3 px-3 font-mono text-2xs text-slate-400 whitespace-nowrap">
                      {c.duration_ms} ms
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal for Case Detail Inspection */}
      {inspectedCase && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <FlaskConical className="w-5 h-5 text-cyan-600" />
                <h4 className="text-sm font-bold text-slate-800">
                  Mutation Case: {inspectedCase.test_id}
                </h4>
              </div>
              <button
                onClick={() => setInspectedCase(null)}
                className="text-slate-400 hover:text-slate-600 text-xs font-semibold cursor-pointer"
              >
                Close ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="font-semibold text-slate-500 uppercase tracking-wider text-2xs block mb-1">
                  Original Claim ({inspectedCase.source_claim_id})
                </span>
                <p className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-slate-700 font-medium">
                  "{inspectedCase.original_text}"
                </p>
              </div>

              <div>
                <span className="font-semibold text-cyan-700 uppercase tracking-wider text-2xs block mb-1">
                  Mutated Generated Test Variant ({inspectedCase.mutation_family})
                </span>
                <p className="p-2.5 bg-cyan-50/50 rounded-lg border border-cyan-200 text-cyan-900 font-mono text-2xs leading-relaxed">
                  "{inspectedCase.mutated_text}"
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-2xs text-slate-500 block font-semibold mb-0.5">Source-Grounded Expected Verdict</span>
                  <span className="font-mono font-bold text-slate-800">{inspectedCase.expected_status}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-2xs text-slate-500 block font-semibold mb-0.5">Actual Verification Verdict</span>
                  <span className="font-mono font-bold text-slate-800">{inspectedCase.actual_status}</span>
                </div>
              </div>

              <div>
                <span className="font-semibold text-slate-500 uppercase tracking-wider text-2xs block mb-1">
                  Evaluation Rationale & Evidence
                </span>
                <p className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-slate-600 leading-relaxed">
                  {inspectedCase.explanation}
                </p>
                {inspectedCase.evidence_ids.length > 0 && (
                  <div className="mt-2 text-2xs text-slate-500">
                    <span className="font-semibold">Associated Evidence Chunks: </span>
                    <span className="font-mono">{inspectedCase.evidence_ids.join(', ')}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
