'use client';

import { useState, useMemo } from 'react';

export type AsinStatus = 'PASS' | 'FAIL' | 'REVIEW';

export interface AsinSummary {
  asin: string;
  productName: string;
  status: AsinStatus;
  passRate: number;  // 0-100
  totalChecks: number;
  passedChecks: number;
  failedChecks: number;
  reviewChecks: number;
  lastUpdated?: string;
}

interface AsinListProps {
  asins: AsinSummary[];
  selectedAsin: string | null;
  onSelect: (asin: string) => void;
  isLoading: boolean;
}

type SortField = 'status' | 'asin' | 'passRate';
type FilterStatus = 'all' | 'pass' | 'fail' | 'review';

const statusConfig: Record<AsinStatus, { label: string; color: string; bg: string; border: string }> = {
  PASS: { label: 'PASS', color: 'text-emerald-700', bg: 'bg-emerald-100', border: 'border-emerald-300' },
  FAIL: { label: 'FAIL', color: 'text-rose-700', bg: 'bg-rose-100', border: 'border-rose-300' },
  REVIEW: { label: 'REVIEW', color: 'text-amber-700', bg: 'bg-amber-100', border: 'border-amber-300' },
};

const statusPriority: Record<AsinStatus, number> = {
  FAIL: 0,
  REVIEW: 1,
  PASS: 2,
};

export function AsinList({ asins, selectedAsin, onSelect, isLoading }: AsinListProps) {
  const [sortBy, setSortBy] = useState<SortField>('status');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');

  const counts = useMemo(() => {
    const pass = asins.filter(a => a.status === 'PASS').length;
    const fail = asins.filter(a => a.status === 'FAIL').length;
    const review = asins.filter(a => a.status === 'REVIEW').length;
    return { pass, fail, review, total: asins.length };
  }, [asins]);

  const filteredAndSorted = useMemo(() => {
    let result = [...asins];

    // Filter
    if (filterStatus !== 'all') {
      result = result.filter(a => a.status.toLowerCase() === filterStatus);
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'status':
          return statusPriority[a.status] - statusPriority[b.status];
        case 'asin':
          return a.asin.localeCompare(b.asin);
        case 'passRate':
          return a.passRate - b.passRate; // Lowest first
        default:
          return 0;
      }
    });

    return result;
  }, [asins, sortBy, filterStatus]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border-2 border-slate-200 shadow-md p-8">
        <div className="flex flex-col items-center justify-center">
          <svg className="animate-spin h-10 w-10 text-indigo-600 mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-sm text-slate-600 font-medium">Loading ASINs...</p>
        </div>
      </div>
    );
  }

  if (asins.length === 0) {
    return (
      <div className="bg-white rounded-xl border-2 border-slate-200 shadow-md p-8">
        <div className="text-center">
          <p className="text-slate-700 font-medium">No ASINs found</p>
          <p className="text-sm text-slate-500 mt-1">Connect to a repository to load reports</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border-2 border-slate-200 shadow-md overflow-hidden">
      {/* Header with counts */}
      <div className="px-5 py-4 border-b-2 border-slate-200 bg-gradient-to-r from-slate-50 to-white">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-slate-900">ASINs</h2>
            <div className="flex items-center gap-2 text-sm">
              <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded-lg font-semibold">
                {counts.total} total
              </span>
              {counts.pass > 0 && (
                <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-lg font-semibold">
                  {counts.pass} pass
                </span>
              )}
              {counts.fail > 0 && (
                <span className="px-2 py-1 bg-rose-100 text-rose-700 rounded-lg font-semibold">
                  {counts.fail} fail
                </span>
              )}
              {counts.review > 0 && (
                <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-lg font-semibold">
                  {counts.review} review
                </span>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3">
            {/* Filter */}
            <div className="flex items-center gap-2">
              <label htmlFor="filter-status" className="text-xs text-slate-600 font-medium">Filter:</label>
              <select
                id="filter-status"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
                className="text-sm border-2 border-slate-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium"
              >
                <option value="all">All</option>
                <option value="pass">Pass</option>
                <option value="fail">Fail</option>
                <option value="review">Review</option>
              </select>
            </div>

            {/* Sort */}
            <div className="flex items-center gap-2">
              <label htmlFor="sort-by" className="text-xs text-slate-600 font-medium">Sort:</label>
              <select
                id="sort-by"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortField)}
                className="text-sm border-2 border-slate-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium"
              >
                <option value="status">Status (failures first)</option>
                <option value="passRate">Pass Rate (lowest first)</option>
                <option value="asin">ASIN (A-Z)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* ASIN List */}
      <div className="flex flex-col gap-3 p-4 max-h-[calc(100vh-200px)] overflow-y-auto">
        {filteredAndSorted.map((item) => {
          const config = statusConfig[item.status];
          const isSelected = selectedAsin === item.asin;

          return (
            <button
              key={item.asin}
              onClick={() => onSelect(item.asin)}
              className={`
                w-full text-left p-4 rounded-lg border-2 transition-all duration-200
                ${isSelected
                  ? 'border-indigo-500 ring-2 ring-indigo-200 bg-indigo-50 shadow-md'
                  : 'border-slate-200 hover:border-indigo-300 hover:shadow-md bg-white'
                }
              `}
            >
              {/* Header row */}
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-xs font-bold text-slate-900 mb-1">
                    {item.asin}
                  </p>
                  <p className="text-xs text-slate-600 line-clamp-2 leading-snug" title={item.productName}>
                    {item.productName}
                  </p>
                </div>
                <span
                  className={`
                    shrink-0 px-2 py-1 text-xs font-bold rounded-md
                    ${config.bg} ${config.color} border ${config.border}
                  `}
                >
                  {config.label}
                </span>
              </div>

              {/* Pass rate bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600">Pass Rate</span>
                  <span className={`font-bold ${item.passRate >= 80 ? 'text-emerald-700' : item.passRate >= 50 ? 'text-amber-700' : 'text-rose-700'}`}>
                    {item.passRate.toFixed(0)}%
                  </span>
                </div>
                <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      item.passRate >= 80 ? 'bg-gradient-to-r from-emerald-500 to-emerald-600' : item.passRate >= 50 ? 'bg-gradient-to-r from-amber-500 to-amber-600' : 'bg-gradient-to-r from-rose-500 to-rose-600'
                    }`}
                    style={{ width: `${item.passRate}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>{item.passedChecks}/{item.totalChecks}</span>
                  {item.failedChecks > 0 && (
                    <span className="text-rose-600 font-semibold">{item.failedChecks} fail</span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {filteredAndSorted.length === 0 && (
        <div className="p-12 text-center">
          <div className="inline-block p-4 bg-slate-100 rounded-full mb-4">
            <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <p className="text-slate-600 font-medium">No ASINs match the current filter</p>
          <p className="text-sm text-slate-500 mt-1">Try adjusting your filters</p>
        </div>
      )}
    </div>
  );
}
