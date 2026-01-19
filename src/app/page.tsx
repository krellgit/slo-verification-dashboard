'use client';

import { useState, useEffect, useCallback } from 'react';
import { ModuleDetail } from '@/components/ModuleDetail';
import { PipelineView } from '@/components/PipelineView';
import { StatsDashboard } from '@/components/StatsDashboard';
import { VerificationResult } from '@/lib/types';

// Components
import { RepoConfig } from '@/components/RepoConfig';
import { AsinList, AsinSummary } from '@/components/AsinList';

// Lib functions
import { listReports, fetchReport, ReportFile, GitHubConfig } from '@/lib/github';
import { parseReport } from '@/lib/reportParser';
import { verify } from '@/lib/verificationEngine';
import { aggregateStats, AggregatedStats } from '@/lib/statsAggregator';

type LoadingState = 'idle' | 'loading' | 'loaded' | 'error';

interface ReportWithResult {
  report: ReportFile;
  result: VerificationResult | null;
  error?: string;
}

export default function Dashboard() {
  // GitHub configuration state
  const [githubConfig, setGithubConfig] = useState<GitHubConfig | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Data state
  const [reports, setReports] = useState<ReportFile[]>([]);
  const [reportResults, setReportResults] = useState<Map<string, ReportWithResult>>(new Map());
  const [aggregatedStats, setAggregatedStats] = useState<AggregatedStats | null>(null);

  // UI state
  const [loadingState, setLoadingState] = useState<LoadingState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedAsin, setSelectedAsin] = useState<string | null>(null);
  const [selectedModule, setSelectedModule] = useState<string | null>(null);

  // Handle GitHub connection
  const handleConnect = useCallback(async (config: GitHubConfig) => {
    setGithubConfig(config);
    setLoadingState('loading');
    setErrorMessage(null);

    try {
      // Fetch list of reports from GitHub
      const reportList = await listReports(config);
      setReports(reportList);

      // Fetch and parse each report
      const resultsMap = new Map<string, ReportWithResult>();
      const verificationResults: VerificationResult[] = [];

      for (const report of reportList) {
        try {
          const content = await fetchReport(report.path, config);
          const parsed = parseReport(content, report.asin);
          const verified = verify(parsed);
          resultsMap.set(report.asin, { report, result: verified });
          verificationResults.push(verified);
        } catch (err) {
          resultsMap.set(report.asin, {
            report,
            result: null,
            error: err instanceof Error ? err.message : 'Failed to parse report'
          });
        }
      }

      setReportResults(resultsMap);

      // Aggregate stats across all reports
      if (verificationResults.length > 0) {
        const stats = aggregateStats(verificationResults);
        setAggregatedStats(stats);
      }

      setIsConnected(true);
      setLoadingState('loaded');

      // Auto-select first ASIN if available
      if (reportList.length > 0) {
        setSelectedAsin(reportList[0].asin);
      }
    } catch (err) {
      setLoadingState('error');
      setErrorMessage(err instanceof Error ? err.message : 'Failed to connect to repository');
      setIsConnected(false);
    }
  }, []);

  // Handle disconnect
  const handleDisconnect = useCallback(() => {
    setGithubConfig(null);
    setIsConnected(false);
    setReports([]);
    setReportResults(new Map());
    setAggregatedStats(null);
    setSelectedAsin(null);
    setSelectedModule(null);
    setLoadingState('idle');
    setErrorMessage(null);
  }, []);

  // Handle ASIN selection
  const handleAsinSelect = useCallback((asin: string) => {
    setSelectedAsin(asin);
    setSelectedModule(null);

    // Auto-select first failing module if any
    const reportData = reportResults.get(asin);
    if (reportData?.result) {
      const failingModule = reportData.result.modules.find(
        (m) => m.status === 'FAIL' || m.status === 'REVIEW_NEEDED'
      );
      if (failingModule) {
        setSelectedModule(failingModule.id);
      } else if (reportData.result.modules.length > 0) {
        setSelectedModule(reportData.result.modules[0].id);
      }
    }
  }, [reportResults]);

  // Handle check click from stats dashboard
  const handleCheckClick = useCallback((checkId: string) => {
    // Extract module ID from check ID (e.g., "M1-01" -> "M1")
    const moduleId = checkId.split('-')[0];

    // Find which ASIN has this failing check
    for (const [asin, data] of reportResults.entries()) {
      if (data.result) {
        const module = data.result.modules.find(m => m.id === moduleId);
        if (module) {
          const check = module.checks.find(c => c.id === checkId && c.status === 'FAIL');
          if (check) {
            setSelectedAsin(asin);
            setSelectedModule(moduleId);
            return;
          }
        }
      }
    }
  }, [reportResults]);

  // Get current selected result
  const selectedResult = selectedAsin ? reportResults.get(selectedAsin)?.result : null;
  const selectedModuleData = selectedResult?.modules.find(m => m.id === selectedModule);

  // Convert reports to AsinSummary format for AsinList
  const asinSummaries: AsinSummary[] = reports.map(report => {
    const data = reportResults.get(report.asin);
    if (!data?.result) {
      return {
        asin: report.asin,
        productName: report.name,
        status: 'FAIL' as const,
        passRate: 0,
        totalChecks: 0,
        passedChecks: 0,
        failedChecks: 0,
        reviewChecks: 0,
      };
    }

    const result = data.result;
    const hasFailed = result.summary.failed > 0;
    const hasReview = result.summary.review > 0;

    let status: 'PASS' | 'FAIL' | 'REVIEW';
    if (hasFailed) status = 'FAIL';
    else if (hasReview) status = 'REVIEW';
    else status = 'PASS';

    return {
      asin: report.asin,
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

  // Convert aggregatedStats to StatsDashboard format
  const dashboardStats = aggregatedStats ? {
    totalAsins: aggregatedStats.totalAsins,
    totalChecks: aggregatedStats.totalChecks,
    totalPassed: aggregatedStats.passedChecks,
    totalFailed: aggregatedStats.failedChecks,
    totalReview: aggregatedStats.reviewChecks,
    overallPassRate: aggregatedStats.totalChecks > 0
      ? Math.round((aggregatedStats.passedChecks / aggregatedStats.totalChecks) * 100)
      : 0,
    moduleStats: Object.entries(aggregatedStats.moduleStats).map(([moduleId, stats]) => ({
      moduleId,
      moduleName: stats.name,
      totalChecks: stats.totalRuns,
      passed: stats.passCount,
      failed: stats.failCount,
      review: 0,
      passRate: stats.passRate,
    })),
    topFailingChecks: aggregatedStats.topFailures.map(f => ({
      checkId: f.checkId,
      checkName: f.checkName,
      moduleId: f.checkId.split('-')[0],
      failCount: f.failCount,
      reasons: f.sampleIssues,
    })),
  } : null;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header with Repo Config */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                SLO Verification Dashboard
              </h1>
              <p className="text-sm text-gray-500">
                {isConnected
                  ? `Connected to ${githubConfig?.owner}/${githubConfig?.repo}`
                  : 'Connect a GitHub repository to get started'}
              </p>
            </div>
            <RepoConfig
              onConnect={handleConnect}
              onDisconnect={handleDisconnect}
              isConnected={isConnected}
              isLoading={loadingState === 'loading'}
              error={errorMessage || undefined}
            />
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Disconnected State - Welcome/Instructions */}
        {!isConnected && loadingState !== 'loading' && (
          <div className="max-w-7xl mx-auto px-4 py-12">
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Welcome to SLO Verification Dashboard
              </h2>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Connect your GitHub repository containing verification reports to view aggregated
                statistics and detailed results for each ASIN.
              </p>
              <div className="bg-gray-50 rounded-lg p-4 text-left max-w-md mx-auto">
                <h3 className="font-medium text-gray-900 mb-2">Getting Started:</h3>
                <ol className="text-sm text-gray-600 space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="font-mono bg-gray-200 text-gray-700 rounded px-1.5 py-0.5 text-xs">1</span>
                    <span>Click the &quot;Connect Repository&quot; button above</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-mono bg-gray-200 text-gray-700 rounded px-1.5 py-0.5 text-xs">2</span>
                    <span>Enter your GitHub repo details (owner/repo)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-mono bg-gray-200 text-gray-700 rounded px-1.5 py-0.5 text-xs">3</span>
                    <span>Provide a GitHub token with read access</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-mono bg-gray-200 text-gray-700 rounded px-1.5 py-0.5 text-xs">4</span>
                    <span>View aggregated stats and per-ASIN results</span>
                  </li>
                </ol>
              </div>
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
                Connection Failed
              </h2>
              <p className="text-red-600 mb-4">{errorMessage}</p>
              <button
                onClick={handleDisconnect}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* Connected State with Data */}
        {isConnected && loadingState === 'loaded' && reports.length > 0 && (
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
                      Failed to load verification data for this ASIN.
                    </p>
                    <p className="text-sm text-yellow-600 mt-1">
                      {reportResults.get(selectedAsin)?.error || 'Unknown error'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Empty State - Connected but no reports */}
        {isConnected && loadingState === 'loaded' && reports.length === 0 && (
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
                The connected repository does not contain any JSON reports in the specified path.
              </p>
              <button
                onClick={handleDisconnect}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Disconnect
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 py-4 text-center text-sm text-gray-500">
          SLO Verification Dashboard
          {selectedResult && (
            <span> | Run ID: {selectedResult.runId} | {selectedResult.timestamp}</span>
          )}
        </div>
      </footer>
    </div>
  );
}
