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
  variant = 'default',
  icon
}: {
  label: string;
  value: string | number;
  subtext?: string;
  variant?: 'default' | 'success' | 'danger' | 'warning';
  icon?: React.ReactNode;
}) {
  const variantStyles = {
    default: 'bg-gradient-to-br from-white to-slate-50 border-slate-200 shadow-md',
    success: 'bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-300 shadow-md shadow-emerald-100',
    danger: 'bg-gradient-to-br from-rose-50 to-rose-100/50 border-rose-300 shadow-md shadow-rose-100',
    warning: 'bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-300 shadow-md shadow-amber-100',
  };

  const valueStyles = {
    default: 'text-slate-900',
    success: 'text-emerald-700',
    danger: 'text-rose-700',
    warning: 'text-amber-700',
  };

  const iconStyles = {
    default: 'text-slate-400',
    success: 'text-emerald-500',
    danger: 'text-rose-500',
    warning: 'text-amber-500',
  };

  return (
    <div className={`rounded-xl border-2 p-6 transition-all duration-200 hover:scale-105 ${variantStyles[variant]}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-slate-600 font-semibold uppercase tracking-wide">{label}</p>
          <p className={`text-3xl font-bold mt-2 ${valueStyles[variant]}`}>{value}</p>
          {subtext && <p className="text-xs text-slate-500 mt-2">{subtext}</p>}
        </div>
        {icon && (
          <div className={`ml-4 p-3 rounded-lg bg-white/50 ${iconStyles[variant]}`}>
            {icon}
          </div>
        )}
      </div>
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
  let barColor = 'bg-gradient-to-r from-emerald-500 to-emerald-600';
  let bgColor = 'bg-emerald-100';
  let textColor = 'text-emerald-700';

  if (percent < 70) {
    barColor = 'bg-gradient-to-r from-rose-500 to-rose-600';
    bgColor = 'bg-rose-100';
    textColor = 'text-rose-700';
  } else if (percent < 85) {
    barColor = 'bg-gradient-to-r from-amber-500 to-amber-600';
    bgColor = 'bg-amber-100';
    textColor = 'text-amber-700';
  }

  return (
    <div className="flex items-center gap-3 group">
      <div className="w-24 text-sm text-slate-700 font-medium truncate" title={label}>
        {label}
      </div>
      <div className={`flex-1 ${bgColor} rounded-full h-4 overflow-hidden shadow-inner`}>
        <div
          className={`h-full ${barColor} transition-all duration-500 ease-out shadow-sm`}
          style={{ width: `${percent}%` }}
        />
      </div>
      {showPercent && (
        <div className={`w-14 text-sm font-bold text-right ${textColor}`}>
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
    <div className="space-y-6">
      {/* Summary Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <SummaryCard
          label="Total ASINs"
          value={stats.totalAsins}
          subtext={`${stats.totalChecks} total checks`}
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          }
        />
        <SummaryCard
          label="Pass Rate"
          value={passRateFormatted}
          variant={stats.overallPassRate >= 90 ? 'success' : stats.overallPassRate >= 70 ? 'warning' : 'danger'}
          subtext={`${stats.totalPassed} passed`}
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          }
        />
        <SummaryCard
          label="Failed Checks"
          value={stats.totalFailed}
          variant={stats.totalFailed === 0 ? 'success' : 'danger'}
          subtext={stats.totalFailed > 0 ? 'Requires attention' : 'All clear'}
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <SummaryCard
          label="Needs Review"
          value={stats.totalReview}
          variant={stats.totalReview === 0 ? 'default' : 'warning'}
          subtext={stats.totalReview > 0 ? 'Manual review needed' : 'None pending'}
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          }
        />
      </div>

      {/* Two Column Layout: Module Performance & Top Failures */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Module Performance */}
        <div className="bg-white rounded-xl border-2 border-slate-200 p-6 shadow-md">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
            </svg>
            <h3 className="text-lg font-bold text-slate-900">Module Performance</h3>
          </div>
          {sortedModules.length === 0 ? (
            <p className="text-sm text-slate-500">No module data available</p>
          ) : (
            <div className="space-y-3">
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
        <div className="bg-white rounded-xl border-2 border-slate-200 p-6 shadow-md">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-5 h-5 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h3 className="text-lg font-bold text-slate-900">Top Failing Checks</h3>
          </div>
          {stats.topFailingChecks.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 p-4 rounded-lg">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium">No failing checks</span>
            </div>
          ) : (
            <div className="space-y-2">
              {stats.topFailingChecks.slice(0, 5).map((check) => (
                <button
                  key={check.checkId}
                  onClick={() => onCheckClick?.(check.checkId)}
                  className="w-full flex items-center justify-between text-left hover:bg-slate-50 p-3 rounded-lg -mx-1 transition-all duration-150 hover:shadow-sm border border-transparent hover:border-slate-200"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-mono text-xs bg-rose-100 text-rose-700 px-2 py-1 rounded-md font-semibold">
                      {check.checkId}
                    </span>
                    <span className="text-sm text-slate-700 truncate font-medium">
                      {check.checkName}
                    </span>
                  </div>
                  <span className="text-sm text-rose-600 font-bold whitespace-nowrap ml-2">
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
        <div className="bg-gradient-to-r from-amber-50 to-amber-100/50 border-2 border-amber-300 rounded-xl p-4 flex items-center gap-4 shadow-md">
          <div className="p-3 bg-amber-100 rounded-lg">
            <svg className="w-6 h-6 text-amber-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <span className="text-sm text-amber-900 font-medium">
            <strong className="font-bold">{issueCount}</strong> {issueCount === 1 ? 'issue' : 'issues'} found across <strong className="font-bold">{stats.totalAsins}</strong> ASIN{stats.totalAsins !== 1 ? 's' : ''} requiring attention
          </span>
        </div>
      )}
    </div>
  );
}
