'use client';

import { useState, useEffect, useCallback } from 'react';
import { ModuleDetail } from '@/components/ModuleDetail';
import { PipelineView } from '@/components/PipelineView';
import { StatsDashboard } from '@/components/StatsDashboard';
import { VerificationResult } from '@/lib/types';
import { AsinList, AsinSummary } from '@/components/AsinList';

type LoadingState = 'loading' | 'loaded' | 'error' | 'not_configured';

interface ReportsResponse {
  configured: boolean;
  reports?: VerificationResult[];
  stats?: {
    totalAsins: number;
    passedAsins: number;
    failedAsins: number;
    reviewAsins: number;
    totalChecks: number;
    passedChecks: number;
    failedChecks: number;
    reviewChecks: number;
    moduleStats: Record<string, {
      name: string;
      totalRuns: number;
      passCount: number;
      failCount: number;
      passRate: number;
    }>;
    topFailures: Array<{
      checkId: string;
      checkName: string;
      failCount: number;
      sampleIssues: string[];
    }>;
  };
  error?: string;
  meta?: {
    totalFiles: number;
    processedFiles: number;
    failedFiles: number;
    timestamp: string;
  };
}

export default function Dashboard() {
  // Data state
  const [reports, setReports] = useState<VerificationResult[]>([]);
  const [stats, setStats] = useState<ReportsResponse['stats'] | null>(null);

  // UI state
  const [loadingState, setLoadingState] = useState<LoadingState>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedAsin, setSelectedAsin] = useState<string | null>(null);
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // Fetch reports from server
  const fetchReports = useCallback(async () => {
    setLoadingState('loading');
    setErrorMessage(null);

    try {
      const res = await fetch('/api/reports');
      const data: ReportsResponse = await res.json();

      if (!data.configured) {
        setLoadingState('not_configured');
        setErrorMessage(data.error || 'Dashboard not configured');
        return;
      }

      if (data.error) {
        setLoadingState('error');
        setErrorMessage(data.error);
        return;
      }

      setReports(data.reports || []);
      setStats(data.stats || null);
      setLastUpdated(data.meta?.timestamp || new Date().toISOString());
      setLoadingState('loaded');

      // Auto-select first ASIN if available
      if (data.reports && data.reports.length > 0 && !selectedAsin) {
        setSelectedAsin(data.reports[0].product.asin);
      }
    } catch (err) {
      setLoadingState('error');
      setErrorMessage(err instanceof Error ? err.message : 'Failed to fetch reports');
    }
  }, [selectedAsin]);

  // Fetch on mount
  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // Handle ASIN selection
  const handleAsinSelect = useCallback((asin: string) => {
    setSelectedAsin(asin);
    setSelectedModule(null);

    // Auto-select first failing module if any
    const report = reports.find(r => r.product.asin === asin);
    if (report) {
      const failingModule = report.modules.find(
        (m) => m.status === 'FAIL' || m.status === 'REVIEW_NEEDED'
      );
      if (failingModule) {
        setSelectedModule(failingModule.id);
      } else if (report.modules.length > 0) {
        setSelectedModule(report.modules[0].id);
      }
    }
  }, [reports]);

  // Handle check click from stats dashboard
  const handleCheckClick = useCallback((checkId: string) => {
    const moduleId = checkId.split('-')[0];

    for (const report of reports) {
      const module = report.modules.find(m => m.id === moduleId);
      if (module) {
        const check = module.checks.find(c => c.id === checkId && c.status === 'FAIL');
        if (check) {
          setSelectedAsin(report.product.asin);
          setSelectedModule(moduleId);
          return;
        }
      }
    }
  }, [reports]);

  // Get current selected result
  const selectedResult = selectedAsin
    ? reports.find(r => r.product.asin === selectedAsin)
    : null;
  const selectedModuleData = selectedResult?.modules.find(m => m.id === selectedModule);

  // Convert reports to AsinSummary format
  const asinSummaries: AsinSummary[] = reports.map(result => {
    const hasFailed = result.summary.failed > 0;
    const hasReview = result.summary.review > 0;

    let status: 'PASS' | 'FAIL' | 'REVIEW';
    if (hasFailed) status = 'FAIL';
    else if (hasReview) status = 'REVIEW';
    else status = 'PASS';

    return {
      asin: result.product.asin,
      productName: result.product.name,
      status,
      passRate: result.summary.totalChecks > 0
        ? Math.round((result.summary.passed / result.summary.totalChecks) * 100)
        : 0,
      totalChecks: result.summary.totalChecks,
      passedChecks: result.summary.passed,
      failedChecks: result.summary.failed,
      reviewChecks: result.summary.review,
    };
  });

  // Convert stats to dashboard format
  const dashboardStats = stats ? {
    totalAsins: stats.totalAsins,
    totalChecks: stats.totalChecks,
    totalPassed: stats.passedChecks,
    totalFailed: stats.failedChecks,
    totalReview: stats.reviewChecks,
    overallPassRate: stats.totalChecks > 0
      ? Math.round((stats.passedChecks / stats.totalChecks) * 100)
      : 0,
    moduleStats: Object.entries(stats.moduleStats).map(([moduleId, modStats]) => ({
      moduleId,
      moduleName: modStats.name,
      totalChecks: modStats.totalRuns,
      passed: modStats.passCount,
      failed: modStats.failCount,
      review: 0,
      passRate: modStats.passRate,
    })),
    topFailingChecks: stats.topFailures.map(f => ({
      checkId: f.checkId,
      checkName: f.checkName,
      moduleId: f.checkId.split('-')[0],
      failCount: f.failCount,
      reasons: f.sampleIssues,
    })),
  } : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex flex-col">
      {/* Header */}
      <header className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b-4 border-indigo-500 sticky top-0 z-10 shadow-xl">
        <div className="max-w-full mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-indigo-600 rounded-xl shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">
                  SLO Verification Dashboard
                </h1>
                <p className="text-sm text-slate-300 mt-0.5">
                  {loadingState === 'loaded' && reports.length > 0
                    ? `${reports.length} ASINs loaded • Real-time verification results`
                    : loadingState === 'loading'
                    ? 'Loading verification results...'
                    : 'Amazon listing verification results'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {loadingState === 'loaded' && (
                <button
                  onClick={fetchReports}
                  className="px-4 py-2.5 text-sm bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-all duration-200 font-medium shadow-md hover:shadow-lg flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh
                </button>
              )}
              <a
                href="/admin"
                className="px-4 py-2.5 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-all duration-200 font-medium shadow-md hover:shadow-lg flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Admin
              </a>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Not Configured State */}
        {loadingState === 'not_configured' && (
          <div className="max-w-7xl mx-auto px-4 py-12">
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Dashboard Not Configured
              </h2>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                The administrator needs to configure the GitHub repository connection
                before verification results can be displayed.
              </p>
              <a
                href="/admin"
                className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Go to Admin Panel
              </a>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loadingState === 'loading' && (
          <div className="max-w-7xl mx-auto px-4 py-12">
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent mb-4" />
              <p className="text-gray-600">Loading verification reports...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {loadingState === 'error' && errorMessage && (
          <div className="max-w-7xl mx-auto px-4 py-12">
            <div className="bg-red-50 rounded-lg border border-red-200 p-8 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-red-800 mb-2">
                Error Loading Reports
              </h2>
              <p className="text-red-600 mb-4">{errorMessage}</p>
              <button
                onClick={fetchReports}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Loaded State with Data */}
        {loadingState === 'loaded' && reports.length > 0 && (
          <div className="max-w-full mx-auto px-6 py-8 space-y-8">
            {/* Stats Dashboard */}
            {dashboardStats && (
              <StatsDashboard
                stats={dashboardStats}
                onCheckClick={handleCheckClick}
              />
            )}

            {/* Two Column Layout: ASIN List + Detail View */}
            <div className="flex gap-8">
              {/* ASIN List - Left Sidebar */}
              <div className="w-96 flex-shrink-0">
                <div className="sticky top-28">
                  <AsinList
                    asins={asinSummaries}
                    selectedAsin={selectedAsin}
                    onSelect={handleAsinSelect}
                    isLoading={false}
                  />
                </div>
              </div>

              {/* Detail View - Main Area */}
              <div className="flex-1 min-w-0 space-y-6">
                {!selectedAsin && (
                  <div className="bg-white rounded-xl border-2 border-slate-200 shadow-md p-12 text-center">
                    <div className="inline-block p-4 bg-indigo-100 rounded-full mb-4">
                      <svg className="w-12 h-12 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                      </svg>
                    </div>
                    <p className="text-slate-700 font-semibold text-lg">Select an ASIN to get started</p>
                    <p className="text-sm text-slate-500 mt-2">Choose an ASIN from the list to view detailed verification results</p>
                  </div>
                )}

                {selectedAsin && selectedResult && (
                  <>
                    {/* ASIN Header */}
                    <div className="bg-gradient-to-r from-white to-slate-50 rounded-xl border-2 border-slate-200 shadow-md px-6 py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <div className="p-2 bg-indigo-100 rounded-lg">
                              <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                              </svg>
                            </div>
                            <div>
                              <h2 className="text-xl font-bold text-slate-900">
                                {selectedResult.product.name}
                              </h2>
                              <div className="flex items-center gap-2 mt-1 text-sm">
                                <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-semibold">
                                  ASIN: {selectedResult.product.asin}
                                </span>
                                <span className="text-slate-400">•</span>
                                <span className="text-slate-600">Run: {selectedResult.runId}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="text-sm text-slate-500 flex-shrink-0">
                          {selectedResult.timestamp}
                        </div>
                      </div>
                    </div>

                    {/* Pipeline View */}
                    <div className="bg-white rounded-xl border-2 border-slate-200 shadow-md overflow-hidden">
                      <div className="px-6 py-4 border-b-2 border-slate-200 bg-gradient-to-r from-slate-50 to-white">
                        <div className="flex items-center gap-2">
                          <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          <h3 className="text-lg font-bold text-slate-900">Pipeline Status</h3>
                        </div>
                        <p className="text-sm text-slate-600 mt-1">
                          <span className="font-bold text-emerald-600">{selectedResult.summary.passed}</span>/{selectedResult.summary.totalChecks} checks passed • {Math.round((selectedResult.summary.passed / selectedResult.summary.totalChecks) * 100)}% pass rate
                        </p>
                      </div>
                      <PipelineView
                        modules={selectedResult.modules}
                        onModuleClick={setSelectedModule}
                        selectedModuleId={selectedModule || undefined}
                      />
                    </div>

                    {/* Module Detail */}
                    {selectedModuleData && (
                      <ModuleDetail
                        module={selectedModuleData}
                        onRerun={() => console.log('Rerun', selectedModule)}
                      />
                    )}

                    {/* Issues Summary */}
                    {selectedResult.summary.failed > 0 && (
                      <div className="bg-gradient-to-r from-rose-50 to-rose-100/50 border-2 border-rose-300 rounded-xl p-6 shadow-md">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="p-2 bg-rose-100 rounded-lg">
                            <svg className="w-6 h-6 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                          </div>
                          <h3 className="font-bold text-rose-900 text-lg">Issues to Resolve</h3>
                        </div>
                        <ul className="space-y-3 text-sm">
                          {selectedResult.modules
                            .filter(m => m.status === 'FAIL' || m.status === 'REVIEW_NEEDED')
                            .flatMap(m =>
                              m.checks
                                .filter(c => c.status === 'FAIL' || c.status === 'REVIEW')
                                .map(c => (
                                  <li key={c.id} className="flex items-start gap-3 bg-white/50 p-3 rounded-lg">
                                    <span className="font-mono bg-rose-200 text-rose-800 px-2 py-1 rounded font-bold text-xs">
                                      {c.id}
                                    </span>
                                    <span className="text-rose-900 font-medium flex-1">{c.issue?.reason || c.name}</span>
                                  </li>
                                ))
                            )}
                        </ul>
                      </div>
                    )}
                  </>
                )}

                {selectedAsin && !selectedResult && (
                  <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-8 text-center">
                    <p className="text-yellow-700">
                      No verification data available for this ASIN.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Empty State - No reports */}
        {loadingState === 'loaded' && reports.length === 0 && (
          <div className="max-w-7xl mx-auto px-4 py-12">
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                No Reports Found
              </h2>
              <p className="text-gray-600 mb-4">
                The configured repository does not contain any JSON reports yet.
              </p>
              <button
                onClick={fetchReports}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Refresh
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-t-4 border-indigo-500 mt-auto shadow-inner">
        <div className="max-w-full mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-600/20 rounded-lg">
                <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <span className="text-sm text-slate-300 font-medium">SLO Verification Dashboard</span>
            </div>
            {lastUpdated && (
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Last updated: {new Date(lastUpdated).toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
