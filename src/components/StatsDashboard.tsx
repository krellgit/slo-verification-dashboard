'use client';

import { useMemo } from 'react';

// AggregatedStats type from statsAggregator (created by another agent)
export interface ModuleStats {
  moduleId: string;
  moduleName: string;
  totalChecks: number;
  passed: number;
  failed: number;
  review: number;
  passRate: number;
}

export interface FailingCheck {
  checkId: string;
  checkName: string;
  moduleId: string;
  failCount: number;
  reasons: string[];
}

export interface AggregatedStats {
  totalAsins: number;
  totalChecks: number;
  totalPassed: number;
  totalFailed: number;
  totalReview: number;
  overallPassRate: number;
  moduleStats: ModuleStats[];
  topFailingChecks: FailingCheck[];
}

interface StatsDashboardProps {
  stats: AggregatedStats;
  onCheckClick?: (checkId: string) => void;
}

function SummaryCard({
  label,
  value,
  subtext,
  variant = 'default'
}: {
  label: string;
  value: string | number;
  subtext?: string;
  variant?: 'default' | 'success' | 'danger' | 'warning';
}) {
  const variantStyles = {
    default: 'bg-white border-gray-200',
    success: 'bg-green-50 border-green-200',
    danger: 'bg-red-50 border-red-200',
    warning: 'bg-yellow-50 border-yellow-200',
  };

  const valueStyles = {
    default: 'text-gray-900',
    success: 'text-green-700',
    danger: 'text-red-700',
    warning: 'text-yellow-700',
  };

  return (
    <div className={`rounded-lg border p-4 ${variantStyles[variant]}`}>
      <p className="text-sm text-gray-500 font-medium">{label}</p>
      <p className={`text-2xl font-bold ${valueStyles[variant]}`}>{value}</p>
      {subtext && <p className="text-xs text-gray-400 mt-1">{subtext}</p>}
    </div>
  );
}

function ProgressBar({
  value,
  max,
  label,
  showPercent = true
}: {
  value: number;
  max: number;
  label: string;
  showPercent?: boolean;
}) {
  const percent = max > 0 ? Math.round((value / max) * 100) : 0;

  // Color based on pass rate
  let barColor = 'bg-green-500';
  if (percent < 70) barColor = 'bg-red-500';
  else if (percent < 85) barColor = 'bg-yellow-500';

  return (
    <div className="flex items-center gap-3">
      <div className="w-20 text-sm text-gray-600 truncate" title={label}>
        {label}
      </div>
      <div className="flex-1 bg-gray-200 rounded-full h-3 overflow-hidden">
        <div
          className={`h-full ${barColor} transition-all duration-300`}
          style={{ width: `${percent}%` }}
        />
      </div>
      {showPercent && (
        <div className="w-12 text-sm text-gray-600 text-right">
          {percent}%
        </div>
      )}
    </div>
  );
}

export function StatsDashboard({ stats, onCheckClick }: StatsDashboardProps) {
  // Sort modules by pass rate (lowest first for attention)
  const sortedModules = useMemo(() => {
    return [...stats.moduleStats].sort((a, b) => a.passRate - b.passRate);
  }, [stats.moduleStats]);

  // Calculate some derived stats
  const passRateFormatted = `${Math.round(stats.overallPassRate)}%`;
  const issueCount = stats.totalFailed + stats.totalReview;

  return (
    <div className="space-y-4">
      {/* Summary Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard
          label="Total ASINs"
          value={stats.totalAsins}
          subtext={`${stats.totalChecks} total checks`}
        />
        <SummaryCard
          label="Pass Rate"
          value={passRateFormatted}
          variant={stats.overallPassRate >= 90 ? 'success' : stats.overallPassRate >= 70 ? 'warning' : 'danger'}
          subtext={`${stats.totalPassed} passed`}
        />
        <SummaryCard
          label="Failed Checks"
          value={stats.totalFailed}
          variant={stats.totalFailed === 0 ? 'success' : 'danger'}
          subtext={stats.totalFailed > 0 ? 'Requires attention' : 'All clear'}
        />
        <SummaryCard
          label="Needs Review"
          value={stats.totalReview}
          variant={stats.totalReview === 0 ? 'default' : 'warning'}
          subtext={stats.totalReview > 0 ? 'Manual review needed' : 'None pending'}
        />
      </div>

      {/* Two Column Layout: Module Performance & Top Failures */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Module Performance */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Module Performance</h3>
          {sortedModules.length === 0 ? (
            <p className="text-sm text-gray-500">No module data available</p>
          ) : (
            <div className="space-y-2">
              {sortedModules.map((module) => (
                <ProgressBar
                  key={module.moduleId}
                  label={module.moduleId}
                  value={module.passed}
                  max={module.totalChecks}
                />
              ))}
            </div>
          )}
        </div>

        {/* Top Failing Checks */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Top Failing Checks</h3>
          {stats.topFailingChecks.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              No failing checks
            </div>
          ) : (
            <div className="space-y-2">
              {stats.topFailingChecks.slice(0, 5).map((check) => (
                <button
                  key={check.checkId}
                  onClick={() => onCheckClick?.(check.checkId)}
                  className="w-full flex items-center justify-between text-left hover:bg-gray-50 p-2 rounded -mx-2 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">
                      {check.checkId}
                    </span>
                    <span className="text-sm text-gray-700 truncate">
                      {check.checkName}
                    </span>
                  </div>
                  <span className="text-sm text-red-600 font-medium whitespace-nowrap ml-2">
                    {check.failCount} {check.failCount === 1 ? 'fail' : 'fails'}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Overall Health Indicator */}
      {issueCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-3">
          <svg className="w-5 h-5 text-amber-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span className="text-sm text-amber-800">
            <strong>{issueCount}</strong> {issueCount === 1 ? 'issue' : 'issues'} found across {stats.totalAsins} ASIN{stats.totalAsins !== 1 ? 's' : ''} requiring attention
          </span>
        </div>
      )}
    </div>
  );
}
