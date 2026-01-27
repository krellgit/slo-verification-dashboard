'use client';

import { useEffect, useState } from 'react';
import { HistoricalSummary } from '@/lib/history';

interface HistoricalStatsProps {
  days?: number;
}

export function HistoricalStats({ days = 30 }: HistoricalStatsProps) {
  const [summary, setSummary] = useState<HistoricalSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [carriedForward, setCarriedForward] = useState(false);

  useEffect(() => {
    async function fetchSummary() {
      try {
        setLoading(true);
        const res = await fetch(`/api/history/trends?days=${days}`);
        const data = await res.json();

        if (res.ok && data.summary) {
          setSummary(data.summary);
          setCarriedForward(data.todayCarriedForward || false);
        }
      } catch (err) {
        console.error('Failed to fetch historical summary:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchSummary();
  }, [days]);

  if (loading || !summary) {
    return null;
  }

  const { delta, sevenDayAvg, improvementRate } = summary;
  const isImproving = delta > 0;
  const isSignificantChange = Math.abs(delta) >= 2;

  return (
    <div className="space-y-4">
      {/* Carried Forward Warning */}
      {carriedForward && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4 flex items-start gap-3">
          <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-amber-900">Using Yesterday&apos;s Data</p>
            <p className="text-xs text-amber-700 mt-1">
              Today&apos;s AWS data is not available. Showing yesterday&apos;s results to maintain historical continuity.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Daily Change */}
      <div className="bg-white rounded-xl border-2 border-slate-200 shadow-md p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-600 font-semibold uppercase tracking-wide">
              vs Yesterday
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-2xl font-bold text-slate-900">
                {summary.current.passRate}%
              </span>
              {isSignificantChange && (
                <div className={`flex items-center gap-1 text-sm font-bold ${isImproving ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {isImproving ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 15l7-7 7 7" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                    </svg>
                  )}
                  <span>{Math.abs(delta).toFixed(1)}%</span>
                </div>
              )}
            </div>
          </div>
          <div className={`p-3 rounded-lg ${isImproving ? 'bg-emerald-100' : delta < 0 ? 'bg-rose-100' : 'bg-slate-100'}`}>
            <svg className={`w-6 h-6 ${isImproving ? 'text-emerald-600' : delta < 0 ? 'text-rose-600' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
            </svg>
          </div>
        </div>
      </div>

      {/* 7-Day Average */}
      <div className="bg-white rounded-xl border-2 border-slate-200 shadow-md p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-600 font-semibold uppercase tracking-wide">
              7-Day Average
            </p>
            <p className="text-2xl font-bold text-indigo-700 mt-2">
              {sevenDayAvg}%
            </p>
          </div>
          <div className="p-3 rounded-lg bg-indigo-100">
            <svg className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Overall Trend */}
      <div className="bg-white rounded-xl border-2 border-slate-200 shadow-md p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-600 font-semibold uppercase tracking-wide">
              {days}-Day Trend
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className={`text-2xl font-bold ${improvementRate >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                {improvementRate >= 0 ? '+' : ''}{improvementRate.toFixed(1)}%
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {improvementRate >= 0 ? 'Improving' : 'Declining'}
            </p>
          </div>
          <div className={`p-3 rounded-lg ${improvementRate >= 0 ? 'bg-emerald-100' : 'bg-rose-100'}`}>
            <svg className={`w-6 h-6 ${improvementRate >= 0 ? 'text-emerald-600' : 'text-rose-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {improvementRate >= 0 ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
              )}
            </svg>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
