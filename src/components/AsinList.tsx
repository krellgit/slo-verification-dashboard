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
  PASS: { label: 'PASS', color: 'text-green-700', bg: 'bg-green-100', border: 'border-green-200' },
  FAIL: { label: 'FAIL', color: 'text-red-700', bg: 'bg-red-100', border: 'border-red-200' },
  REVIEW: { label: 'REVIEW', color: 'text-yellow-700', bg: 'bg-yellow-100', border: 'border-yellow-200' },
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
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8">
        <div className="flex flex-col items-center justify-center">
          <svg className="animate-spin h-8 w-8 text-blue-500 mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-sm text-gray-500">Loading ASINs...</p>
        </div>
      </div>
    );
  }

  if (asins.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8">
        <div className="text-center">
          <p className="text-gray-500">No ASINs found</p>
          <p className="text-sm text-gray-400 mt-1">Connect to a repository to load reports</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      {/* Header with counts */}
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-gray-900">ASINs</h2>
            <span className="text-sm text-gray-500">
              {counts.total} total
              {counts.pass > 0 && <span className="text-green-600 ml-2">{counts.pass} pass</span>}
              {counts.fail > 0 && <span className="text-red-600 ml-2">{counts.fail} fail</span>}
              {counts.review > 0 && <span className="text-yellow-600 ml-2">{counts.review} review</span>}
            </span>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3">
            {/* Filter */}
            <div className="flex items-center gap-1">
              <label htmlFor="filter-status" className="text-xs text-gray-500">Filter:</label>
              <select
                id="filter-status"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
                className="text-sm border border-gray-300 rounded px-2 py-1 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All</option>
                <option value="pass">Pass</option>
                <option value="fail">Fail</option>
                <option value="review">Review</option>
              </select>
            </div>

            {/* Sort */}
            <div className="flex items-center gap-1">
              <label htmlFor="sort-by" className="text-xs text-gray-500">Sort:</label>
              <select
                id="sort-by"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortField)}
                className="text-sm border border-gray-300 rounded px-2 py-1 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="status">Status (failures first)</option>
                <option value="passRate">Pass Rate (lowest first)</option>
                <option value="asin">ASIN (A-Z)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* ASIN Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 p-4">
        {filteredAndSorted.map((item) => {
          const config = statusConfig[item.status];
          const isSelected = selectedAsin === item.asin;

          return (
            <button
              key={item.asin}
              onClick={() => onSelect(item.asin)}
              className={`
                text-left p-4 rounded-lg border-2 transition-all duration-150
                ${isSelected
                  ? 'border-blue-500 ring-2 ring-blue-200 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 hover:shadow-sm bg-white'
                }
              `}
            >
              {/* Header row */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-sm font-semibold text-gray-900 truncate">
                    {item.asin}
                  </p>
                  <p className="text-xs text-gray-500 truncate" title={item.productName}>
                    {item.productName}
                  </p>
                </div>
                <span
                  className={`
                    shrink-0 px-2 py-0.5 text-xs font-semibold rounded
                    ${config.bg} ${config.color} ${config.border} border
                  `}
                >
                  {config.label}
                </span>
              </div>

              {/* Pass rate bar */}
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-gray-500">Pass Rate</span>
                  <span className={`font-medium ${item.passRate >= 80 ? 'text-green-600' : item.passRate >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {item.passRate.toFixed(0)}%
                  </span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      item.passRate >= 80 ? 'bg-green-500' : item.passRate >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${item.passRate}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-gray-400 mt-1">
                  <span>{item.passedChecks}/{item.totalChecks} checks</span>
                  {item.failedChecks > 0 && (
                    <span className="text-red-500">{item.failedChecks} failed</span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {filteredAndSorted.length === 0 && (
        <div className="p-8 text-center">
          <p className="text-gray-500">No ASINs match the current filter</p>
        </div>
      )}
    </div>
  );
}
