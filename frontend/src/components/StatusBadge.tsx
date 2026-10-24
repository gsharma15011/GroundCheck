import React from 'react';
import { CheckCircle2, HelpCircle, AlertCircle, AlertTriangle } from 'lucide-react';
import { ClaimStatus } from '../types/api';

interface Props {
  status: ClaimStatus | string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export const StatusBadge: React.FC<Props> = ({ status, size = 'md', showIcon = true }) => {
  const normalized = status.toUpperCase();

  const getStyle = () => {
    switch (normalized) {
      case 'SUPPORTED':
        return {
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
          icon: <CheckCircle2 className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />,
          label: 'SUPPORTED',
        };
      case 'UNSUPPORTED':
        return {
          bg: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
          icon: <HelpCircle className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />,
          label: 'UNSUPPORTED',
        };
      case 'CONTRADICTED':
        return {
          bg: 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
          icon: <AlertCircle className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />,
          label: 'CONTRADICTED',
        };
      case 'REVIEW':
      case 'CONFLICT':
        return {
          bg: 'bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800',
          icon: <AlertTriangle className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />,
          label: 'REVIEW / CONFLICT',
        };
      default:
        return {
          bg: 'bg-slate-100 text-slate-700 border-slate-200',
          icon: null,
          label: normalized,
        };
    }
  };

  const style = getStyle();
  const sizeClasses =
    size === 'sm'
      ? 'text-xs px-2 py-0.5 font-medium'
      : size === 'lg'
      ? 'text-sm px-3.5 py-1.5 font-semibold'
      : 'text-xs px-2.5 py-1 font-semibold';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border shadow-xs tracking-wide ${style.bg} ${sizeClasses}`}
      role="status"
      aria-label={`Claim status: ${style.label}`}
    >
      {showIcon && style.icon}
      <span>{style.label}</span>
    </span>
  );
};
