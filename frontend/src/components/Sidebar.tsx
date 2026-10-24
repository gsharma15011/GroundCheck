import React from 'react';
import {
  LayoutDashboard,
  ShieldCheck,
  FlaskConical,
  Library,
  History,
  Settings,
  Sparkles,
  Server,
  Activity,
  Layers,
} from 'lucide-react';
import { StatusResponse } from '../types/api';

export type NavTab = 'overview' | 'workspace' | 'mutation' | 'evidence' | 'history' | 'settings';

interface Props {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  status: StatusResponse | null;
  demoMode: boolean;
  onToggleDemoMode: () => void;
}

export const Sidebar: React.FC<Props> = ({
  currentTab,
  onSelectTab,
  status,
  demoMode,
  onToggleDemoMode,
}) => {
  const navItems = [
    { id: 'overview' as NavTab, label: 'Overview', icon: LayoutDashboard },
    { id: 'workspace' as NavTab, label: 'Audit Workspace', icon: ShieldCheck },
    { id: 'mutation' as NavTab, label: 'Mutation Lab', icon: FlaskConical, badge: 'Differentiator' },
    { id: 'evidence' as NavTab, label: 'Evidence Library', icon: Library },
    { id: 'history' as NavTab, label: 'Audit History', icon: History },
    { id: 'settings' as NavTab, label: 'Settings / Model Status', icon: Settings },
  ];

  const currentMode = demoMode ? 'DEMO' : (status?.current_mode || 'LIVE');

  const getModeBadge = () => {
    switch (currentMode) {
      case 'LIVE':
        return {
          bg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
          dot: 'bg-emerald-400',
          text: 'LIVE INFERENCE',
        };
      case 'DEMO':
        return {
          bg: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
          dot: 'bg-cyan-400',
          text: 'DEMO / FIXTURE',
        };
      case 'DEGRADED':
      default:
        return {
          bg: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
          dot: 'bg-amber-400',
          text: 'DEGRADED MODE',
        };
    }
  };

  const modeBadge = getModeBadge();

  return (
    <aside className="w-64 bg-ink-950 text-slate-300 flex flex-col justify-between border-r border-ink-800 shrink-0 select-none">
      <div>
        {/* Brand Header */}
        <div className="p-5 border-b border-ink-800/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-primary to-cyan-500 flex items-center justify-center text-white shadow-md shadow-brand-primary/20">
              <ShieldCheck className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-white m-0 leading-none">
                GroundCheck
              </h1>
              <p className="text-2xs text-slate-400 mt-1 font-medium leading-none">
                Evidence-First AI Verifier
              </p>
            </div>
          </div>

          {/* Mode Indicator & Switcher */}
          <div className="mt-4 pt-3 border-t border-ink-800/60 flex items-center justify-between">
            <div
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-2xs font-semibold border ${modeBadge.bg}`}
              title="System Operating Mode"
            >
              <span className={`w-1.5 h-1.5 rounded-full ${modeBadge.dot} animate-pulse`} />
              <span>{modeBadge.text}</span>
            </div>

            <button
              onClick={onToggleDemoMode}
              className={`text-2xs font-mono px-2 py-0.5 rounded border transition-colors ${
                demoMode
                  ? 'bg-cyan-900/60 text-cyan-200 border-cyan-700 hover:bg-cyan-800/60'
                  : 'bg-ink-850 text-slate-400 border-ink-700 hover:text-slate-200'
              }`}
              title="Toggle between deterministic demo mode fixtures and live model evaluation"
            >
              {demoMode ? 'Demo: ON' : 'Demo: OFF'}
            </button>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const isActive = currentTab === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-brand-primary/20 text-white border border-brand-primary/40 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-ink-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 ${isActive ? 'text-brand-accent' : 'text-slate-500'}`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-3xs uppercase tracking-wider font-bold px-1.5 py-0.5 rounded-sm bg-cyan-950 text-cyan-300 border border-cyan-800">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer System Status */}
      <div className="p-4 border-t border-ink-800/80 bg-ink-900/50">
        <div className="text-2xs text-slate-400 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Server className="w-3 h-3 text-slate-500" />
              <span>FastAPI Backend</span>
            </span>
            <span className={status?.api_ready ? 'text-emerald-400' : 'text-rose-400'}>
              {status?.api_ready ? 'Connected' : 'Offline'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Layers className="w-3 h-3 text-slate-500" />
              <span>Acme Corp Corpus</span>
            </span>
            <span className="text-slate-300 font-mono">
              {status?.corpus_chunks_count || 9} chunks
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
};
