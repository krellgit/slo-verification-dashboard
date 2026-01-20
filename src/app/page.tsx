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
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                SLO Verification Dashboard
              </h1>
              <p className="text-sm text-gray-500">
                {loadingState === 'loaded' && reports.length > 0
                  ? `${reports.length} ASINs loaded`
                  : loadingState === 'loading'
                  ? 'Loading...'
                  : 'Verification results'}
              </p>
            </div>
            <div className="flex items-center gap-4">
              {loadingState === 'loaded' && (
                <button
                  onClick={fetchReports}
                  className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                >
                  Refresh
                </button>
              )}
              <a
                href="/admin"
                className="px-3 py-1.5 text-sm bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
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
          <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
            {/* Stats Dashboard */}
            {dashboardStats && (
              <StatsDashboard
                stats={dashboardStats}
                onCheckClick={handleCheckClick}
              />
            )}

            {/* Two Column Layout: ASIN List + Detail View */}
            <div className="flex gap-6">
              {/* ASIN List - Left Sidebar */}
              <div className="w-80 flex-shrink-0">
                <div className="bg-white rounded-lg border border-gray-200 sticky top-24">
                  <div className="px-4 py-3 border-b border-gray-200">
                    <h2 className="font-semibold text-gray-900">
                      ASINs ({reports.length})
                    </h2>
                  </div>
                  <AsinList
                    asins={asinSummaries}
                    selectedAsin={selectedAsin}
                    onSelect={handleAsinSelect}
                    isLoading={false}
                  />
                </div>
              </div>

              {/* Detail View - Main Area */}
              <div className="flex-1 min-w-0 space-y-4">
                {!selectedAsin && (
                  <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
                    Select an ASIN from the list to view details
                  </div>
                )}

                {selectedAsin && selectedResult && (
                  <>
                    {/* ASIN Header */}
                    <div className="bg-white rounded-lg border border-gray-200 px-4 py-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h2 className="text-lg font-semibold text-gray-900">
                            {selectedResult.product.name}
                          </h2>
                          <p className="text-sm text-gray-500">
                            ASIN: {selectedResult.product.asin} | Run: {selectedResult.runId}
                          </p>
                        </div>
                        <div className="text-sm text-gray-400">
                          {selectedResult.timestamp}
                        </div>
                      </div>
                    </div>

                    {/* Pipeline View */}
                    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                      <div className="px-4 py-3 border-b border-gray-200">
                        <h3 className="text-sm font-semibold text-gray-900">Pipeline Status</h3>
                        <p className="text-xs text-gray-500">
                          {selectedResult.summary.passed}/{selectedResult.summary.totalChecks} checks passed
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
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <h3 className="font-semibold text-red-800 mb-2">Issues to Resolve</h3>
                        <ul className="space-y-2 text-sm text-red-700">
                          {selectedResult.modules
                            .filter(m => m.status === 'FAIL' || m.status === 'REVIEW_NEEDED')
                            .flatMap(m =>
                              m.checks
                                .filter(c => c.status === 'FAIL' || c.status === 'REVIEW')
                                .map(c => (
                                  <li key={c.id} className="flex items-start gap-2">
                                    <span className="font-mono bg-red-100 px-1 rounded">{c.id}</span>
                                    <span>{c.issue?.reason || c.name}</span>
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
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 py-4 text-center text-sm text-gray-500">
          SLO Verification Dashboard
          {lastUpdated && (
            <span> | Last updated: {new Date(lastUpdated).toLocaleString()}</span>
          )}
        </div>
      </footer>
    </div>
  );
}
