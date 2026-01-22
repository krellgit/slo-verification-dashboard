// Historical Pass Rate Tracking Library
// Uses Vercel KV for storing daily verification statistics

import { VerificationResult } from './types';

export interface DailyStats {
  date: string; // YYYY-MM-DD format
  timestamp: string;

  // Overall metrics
  totalAsins: number;
  totalChecks: number;
  passedChecks: number;
  failedChecks: number;
  reviewChecks: number;
  passRate: number;

  // Per-module breakdown
  moduleStats: {
    [moduleId: string]: {
      passed: number;
      total: number;
      passRate: number;
    };
  };

  // Per-ASIN breakdown
  asinStats: Array<{
    asin: string;
    productName: string;
    passRate: number;
    passed: number;
    total: number;
  }>;
}

export interface TrendDataPoint {
  date: string;
  passRate: number;
  totalChecks: number;
  passedChecks: number;
  failedChecks: number;
  asinCount: number;
}

export interface HistoricalSummary {
  current: TrendDataPoint;
  previous: TrendDataPoint | null;
  delta: number; // Change from previous day
  sevenDayAvg: number;
  thirtyDayAvg: number;
  bestDay: TrendDataPoint | null;
  worstDay: TrendDataPoint | null;
  improvementRate: number; // Overall trend
}

/**
 * Calculate aggregate stats from verification results
 */
export function calculateDailyStats(
  reports: VerificationResult[],
  date?: string
): DailyStats {
  const statsDate = date || new Date().toISOString().split('T')[0];

  let totalChecks = 0;
  let passedChecks = 0;
  let failedChecks = 0;
  let reviewChecks = 0;

  const moduleAggregates: Record<string, { passed: number; total: number }> = {};

  const asinStats = reports.map(result => {
    totalChecks += result.summary.totalChecks;
    passedChecks += result.summary.passed;
    failedChecks += result.summary.failed;
    reviewChecks += result.summary.review;

    // Aggregate by module
    result.modules.forEach(module => {
      if (!moduleAggregates[module.id]) {
        moduleAggregates[module.id] = { passed: 0, total: 0 };
      }
      moduleAggregates[module.id].passed += module.checksPassed;
      moduleAggregates[module.id].total += module.checksTotal;
    });

    return {
      asin: result.product.asin,
      productName: result.product.name,
      passRate: result.summary.totalChecks > 0
        ? Math.round((result.summary.passed / result.summary.totalChecks) * 100)
        : 0,
      passed: result.summary.passed,
      total: result.summary.totalChecks,
    };
  });

  const moduleStats = Object.entries(moduleAggregates).reduce((acc, [moduleId, stats]) => {
    acc[moduleId] = {
      passed: stats.passed,
      total: stats.total,
      passRate: stats.total > 0 ? Math.round((stats.passed / stats.total) * 100) : 0,
    };
    return acc;
  }, {} as DailyStats['moduleStats']);

  return {
    date: statsDate,
    timestamp: new Date().toISOString(),
    totalAsins: reports.length,
    totalChecks,
    passedChecks,
    failedChecks,
    reviewChecks,
    passRate: totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 0,
    moduleStats,
    asinStats,
  };
}

/**
 * Format trend data for charting
 */
export function formatTrendData(dailyStats: DailyStats[]): TrendDataPoint[] {
  return dailyStats
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(stat => ({
      date: stat.date,
      passRate: stat.passRate,
      totalChecks: stat.totalChecks,
      passedChecks: stat.passedChecks,
      failedChecks: stat.failedChecks,
      asinCount: stat.totalAsins,
    }));
}

/**
 * Calculate historical summary statistics
 */
export function calculateHistoricalSummary(
  trendData: TrendDataPoint[]
): HistoricalSummary | null {
  if (trendData.length === 0) {
    return null;
  }

  const sorted = [...trendData].sort((a, b) => b.date.localeCompare(a.date));
  const current = sorted[0];
  const previous = sorted[1] || null;

  const delta = previous ? current.passRate - previous.passRate : 0;

  // Calculate averages
  const sevenDayData = sorted.slice(0, 7);
  const thirtyDayData = sorted.slice(0, 30);

  const sevenDayAvg = sevenDayData.length > 0
    ? Math.round(sevenDayData.reduce((sum, d) => sum + d.passRate, 0) / sevenDayData.length)
    : current.passRate;

  const thirtyDayAvg = thirtyDayData.length > 0
    ? Math.round(thirtyDayData.reduce((sum, d) => sum + d.passRate, 0) / thirtyDayData.length)
    : current.passRate;

  // Find best and worst days
  const bestDay = [...sorted].sort((a, b) => b.passRate - a.passRate)[0];
  const worstDay = [...sorted].sort((a, b) => a.passRate - b.passRate)[0];

  // Calculate improvement rate (slope of last 30 days)
  let improvementRate = 0;
  if (thirtyDayData.length >= 2) {
    const oldest = thirtyDayData[thirtyDayData.length - 1];
    const newest = thirtyDayData[0];
    improvementRate = newest.passRate - oldest.passRate;
  }

  return {
    current,
    previous,
    delta,
    sevenDayAvg,
    thirtyDayAvg,
    bestDay,
    worstDay,
    improvementRate,
  };
}

/**
 * Get KV key for daily stats
 */
export function getDailyStatsKey(date: string): string {
  return `history:daily:${date}`;
}

/**
 * Get KV key pattern for date range
 */
export function getDateRangeKeys(days: number): string[] {
  const keys: string[] = [];
  const today = new Date();

  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    keys.push(getDailyStatsKey(dateStr));
  }

  return keys;
}
