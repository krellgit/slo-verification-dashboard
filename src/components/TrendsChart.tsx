'use client';

import { useEffect, useState } from 'react';
import { TrendDataPoint } from '@/lib/history';

interface TrendsChartProps {
  days?: number;
  asin?: string;
}

export function TrendsChart({ days = 30, asin }: TrendsChartProps) {
  const [trends, setTrends] = useState<TrendDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTrends() {
      try {
        setLoading(true);
        const params = new URLSearchParams({ days: days.toString() });
        if (asin) params.append('asin', asin);

        const res = await fetch(`/api/history/trends?${params}`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Failed to fetch trends');
        }

        setTrends(data.trends || []);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load trends');
        setTrends([]);
      } finally {
        setLoading(false);
      }
    }

    fetchTrends();
  }, [days, asin]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border-2 border-slate-200 shadow-md p-8">
        <div className="flex items-center justify-center">
          <svg className="animate-spin h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="ml-3 text-slate-600">Loading trends...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-rose-50 border-2 border-rose-200 rounded-xl p-6">
        <div className="flex items-center gap-2 text-rose-700">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="font-medium">{error}</span>
        </div>
      </div>
    );
  }

  if (trends.length === 0) {
    return (
      <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-8 text-center">
        <div className="inline-block p-3 bg-amber-100 rounded-full mb-3">
          <svg className="w-8 h-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-amber-800 font-medium">No historical data available yet</p>
        <p className="text-sm text-amber-600 mt-1">
          Data will be recorded automatically as you use the dashboard
        </p>
      </div>
    );
  }

  // Calculate chart dimensions and scaling
  const width = 800;
  const height = 300;
  const padding = { top: 20, right: 40, bottom: 40, left: 50 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const maxPassRate = Math.max(...trends.map(t => t.passRate), 100);
  const minPassRate = Math.min(...trends.map(t => t.passRate), 0);
  const passRateRange = maxPassRate - minPassRate || 100;

  // Create path for line chart
  const points = trends.map((point, index) => {
    const x = padding.left + (index / (trends.length - 1 || 1)) * chartWidth;
    const y = padding.top + chartHeight - ((point.passRate - minPassRate) / passRateRange) * chartHeight;
    return { x, y, ...point };
  });

  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ');

  // Area fill path
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${padding.top + chartHeight} L ${points[0].x} ${padding.top + chartHeight} Z`;

  return (
    <div className="bg-white rounded-xl border-2 border-slate-200 shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
          </svg>
          <h3 className="text-lg font-bold text-slate-900">Pass Rate Trends</h3>
        </div>
        <div className="text-sm text-slate-600">
          Last {trends.length} day{trends.length !== 1 ? 's' : ''}
        </div>
      </div>

      <svg
        width={width}
        height={height}
        className="w-full"
        viewBox={`0 0 ${width} ${height}`}
      >
        {/* Grid lines */}
        {[0, 25, 50, 75, 100].map(value => {
          const y = padding.top + chartHeight - ((value - minPassRate) / passRateRange) * chartHeight;
          return (
            <g key={value}>
              <line
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                stroke="#e2e8f0"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
              <text
                x={padding.left - 10}
                y={y + 4}
                textAnchor="end"
                className="text-xs fill-slate-500"
              >
                {value}%
              </text>
            </g>
          );
        })}

        {/* Area fill */}
        <path
          d={areaPath}
          fill="url(#gradient)"
          opacity="0.3"
        />

        {/* Line */}
        <path
          d={linePath}
          fill="none"
          stroke="#4f46e5"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points */}
        {points.map((point, i) => (
          <g key={i}>
            <circle
              cx={point.x}
              cy={point.y}
              r="4"
              fill="white"
              stroke="#4f46e5"
              strokeWidth="2"
            />
            <title>
              {point.date}: {point.passRate}%
            </title>
          </g>
        ))}

        {/* X-axis labels (every 5 days or first/last) */}
        {points.map((point, i) => {
          const showLabel = i === 0 || i === points.length - 1 || i % 5 === 0;
          if (!showLabel) return null;

          const dateLabel = new Date(point.date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          });

          return (
            <text
              key={i}
              x={point.x}
              y={height - padding.bottom + 20}
              textAnchor="middle"
              className="text-xs fill-slate-600"
            >
              {dateLabel}
            </text>
          );
        })}

        {/* Gradient definition */}
        <defs>
          <linearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.05" />
          </linearGradient>
        </defs>
      </svg>

      {/* Legend */}
      <div className="mt-4 flex items-center justify-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-indigo-600"></div>
          <span className="text-slate-700">Pass Rate</span>
        </div>
        <div className="text-slate-500">
          Range: {Math.min(...trends.map(t => t.passRate))}% - {Math.max(...trends.map(t => t.passRate))}%
        </div>
      </div>
    </div>
  );
}
