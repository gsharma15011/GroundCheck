import React, { useState, useEffect } from 'react';
import { Sidebar, NavTab } from './components/Sidebar';
import { OverviewPage } from './pages/OverviewPage';
import { WorkspacePage } from './pages/WorkspacePage';
import { MutationLabPage } from './pages/MutationLabPage';
import { EvidenceLibraryPage } from './pages/EvidenceLibraryPage';
import { HistoryPage } from './pages/HistoryPage';
import { SettingsPage } from './pages/SettingsPage';
import {
  StatusResponse,
  VerifyResponse,
  HistorySummaryItem,
  ClaimVerificationResult,
} from './types/api';
import { api } from './lib/api';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<NavTab>('overview');
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [history, setHistory] = useState<HistorySummaryItem[]>([]);
  const [currentAudit, setCurrentAudit] = useState<VerifyResponse | null>(null);
  const [demoMode, setDemoMode] = useState<boolean>(true); // Default demo mode active for reliable presentation
  const [mutationClaims, setMutationClaims] = useState<ClaimVerificationResult[]>([]);

  // Fetch initial status and history
  const refreshStatus = async () => {
    try {
      const s = await api.getStatus();
      setStatus(s);
    } catch (err) {
      console.warn('API status check offline:', err);
    }
  };

  const refreshHistory = async () => {
    try {
      const h = await api.getHistory();
      setHistory(h);
    } catch (err) {
      console.warn('API history fetch offline:', err);
    }
  };

  useEffect(() => {
    refreshStatus();
    refreshHistory();

    const interval = setInterval(() => {
      refreshStatus();
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  const handleAuditComplete = (audit: VerifyResponse) => {
    setCurrentAudit(audit);
    setMutationClaims(audit.claims);
    refreshHistory();
  };

  const handleStartAuditFromOverview = (presetId?: string) => {
    setCurrentTab('workspace');
  };

  const handleOpenMutationFromWorkspace = (claims: ClaimVerificationResult[]) => {
    setMutationClaims(claims);
    setCurrentTab('mutation');
  };

  const handleRestoreAuditFromHistory = (audit: VerifyResponse) => {
    setCurrentAudit(audit);
    setMutationClaims(audit.claims);
    setCurrentTab('workspace');
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-canvas-100 font-sans text-slate-900">
      {/* Persistent Left Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        status={status}
        demoMode={demoMode}
        onToggleDemoMode={() => setDemoMode(!demoMode)}
      />

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto bg-slate-50/50">
        {currentTab === 'overview' && (
          <OverviewPage
            status={status}
            history={history}
            onStartAudit={handleStartAuditFromOverview}
            onNavigate={setCurrentTab}
          />
        )}

        {currentTab === 'workspace' && (
          <WorkspacePage
            currentAudit={currentAudit}
            onAuditComplete={handleAuditComplete}
            onOpenMutationLab={handleOpenMutationFromWorkspace}
            demoMode={demoMode}
          />
        )}

        {currentTab === 'mutation' && (
          <MutationLabPage
            claimsFromWorkspace={mutationClaims}
            demoMode={demoMode}
          />
        )}

        {currentTab === 'evidence' && <EvidenceLibraryPage />}

        {currentTab === 'history' && (
          <HistoryPage
            history={history}
            onRestoreAudit={handleRestoreAuditFromHistory}
            onRefreshHistory={refreshHistory}
          />
        )}

        {currentTab === 'settings' && (
          <SettingsPage
            status={status}
            demoMode={demoMode}
            onToggleDemoMode={() => setDemoMode(!demoMode)}
            onRefreshStatus={refreshStatus}
          />
        )}
      </main>
    </div>
  );
};

export default App;
