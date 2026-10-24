import React from 'react';
import { ShieldCheck, Target, CheckCircle2, HelpCircle, AlertCircle, Clock } from 'lucide-react';
import { AuditMetrics } from '../types/api';

interface Props {
  metrics: AuditMetrics;
  mode: string;
}

export const MetricsStrip: React.FC<Props> = ({ metrics, mode }) => {
  const trustScoreFormatted =
    metrics.trust_score !== null && metrics.trust_score !== undefined
      ? `${metrics.trust_score.toFixed(1)}%`
      : 'N/A';

  const getTrustColor = (score?: number | null) => {
    if (score === null || score === undefined) return 'text-slate-500';
    if (score >= 80) return 'text-emerald-600 dark:text-emerald-400';
    if (score >= 50) return 'text-amber-600 dark:text-amber-400';
    return 'text-rose-600 dark:text-rose-400';
  };

  const coveragePercent = Math.round(metrics.verification_coverage * 100);

  return (
    <div className="bg-white border border-slate-200/80 rounded-xl shadow-xs p-4 mb-6 transition-all">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
        {/* Trust Score */}
        <div className="flex flex-col items-start px-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4 text-brand-primary" />
            <span>Trust Score</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className={`text-2xl font-bold font-mono ${getTrustColor(metrics.trust_score)}`}>
              {trustScoreFormatted}
            </span>
            <span className="text-xs text-slate-400">
              ({metrics.supported_count}/{metrics.total_claims} claims)
            </span>
          </div>
        </div>

        {/* Verification Coverage */}
        <div className="flex flex-col items-start px-2 pt-3 sm:pt-0">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            <Target className="w-4 h-4 text-cyan-600" />
            <span>Coverage</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold font-mono text-slate-800">
              {coveragePercent}%
            </span>
            <span className="text-xs text-slate-400">
              ({metrics.evaluated_claims}/{metrics.total_claims})
            </span>
          </div>
        </div>

        {/* Supported */}
        <div className="flex flex-col items-start px-2 pt-3 sm:pt-0">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-1">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Supported</span>
          </div>
          <span className="text-2xl font-bold font-mono text-emerald-700">
            {metrics.supported_count}
          </span>
        </div>

        {/* Unsupported */}
        <div className="flex flex-col items-start px-2 pt-3 sm:pt-0">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 uppercase tracking-wider mb-1">
            <HelpCircle className="w-4 h-4 text-amber-600" />
            <span>Unsupported</span>
          </div>
          <span className="text-2xl font-bold font-mono text-amber-700">
            {metrics.unsupported_count}
          </span>
        </div>

        {/* Contradicted */}
        <div className="flex flex-col items-start px-2 pt-3 sm:pt-0">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-700 uppercase tracking-wider mb-1">
            <AlertCircle className="w-4 h-4 text-rose-600" />
            <span>Contradicted</span>
          </div>
          <span className="text-2xl font-bold font-mono text-rose-700">
            {metrics.contradicted_count}
          </span>
        </div>

        {/* Latency & Mode */}
        <div className="flex flex-col items-start px-2 pt-3 sm:pt-0">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            <Clock className="w-4 h-4 text-slate-400" />
            <span>Latency</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold font-mono text-slate-700">
              {Math.round(metrics.processing_time_ms)}
              <span className="text-xs font-normal text-slate-400 ml-0.5">ms</span>
            </span>
            <span className="text-2xs uppercase px-1.5 py-0.5 font-bold rounded-sm bg-slate-100 text-slate-600 border border-slate-200">
              {mode}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
