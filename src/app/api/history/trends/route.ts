// GET /api/history/trends?days=30&asin=B001...
// Returns time-series data for trending charts

import { NextRequest, NextResponse } from 'next/server';
import { getDateRangeKeys, formatTrendData, calculateHistoricalSummary, type DailyStats } from '@/lib/history';

// Try to import Vercel KV
let kv: any = null;
try {
  kv = require('@vercel/kv').kv;
} catch {
  console.warn('[History] Vercel KV not available');
}

// In-memory fallback
const memoryStore = new Map<string, DailyStats>();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30', 10);
    const asinFilter = searchParams.get('asin');

    if (days < 1 || days > 365) {
      return NextResponse.json(
        { error: 'Days must be between 1 and 365' },
        { status: 400 }
      );
    }

    // Get keys for date range
    const keys = getDateRangeKeys(days);

    // Fetch all data
    const dailyStats: DailyStats[] = [];

    if (kv) {
      // Batch fetch from KV
      const results = await Promise.all(
        keys.map(async key => {
          try {
            return await kv.get(key);
          } catch {
            return null;
          }
        })
      );

      dailyStats.push(...results.filter((r): r is DailyStats => r !== null));
    } else {
      // Fetch from memory
      keys.forEach(key => {
        const stat = memoryStore.get(key);
        if (stat) dailyStats.push(stat);
      });
    }

    // Filter by ASIN if requested
    let filteredStats = dailyStats;
    if (asinFilter) {
      filteredStats = dailyStats.map(stat => ({
        ...stat,
        // Recalculate metrics for single ASIN
        ...(() => {
          const asinData = stat.asinStats.find(a => a.asin === asinFilter);
          if (!asinData) return {};

          return {
            passRate: asinData.passRate,
            totalChecks: asinData.total,
            passedChecks: asinData.passed,
            failedChecks: asinData.total - asinData.passed,
            totalAsins: 1,
          };
        })(),
      })).filter(stat => stat.asinStats.some(a => a.asin === asinFilter));
    }

    // Format for charting
    const trendData = formatTrendData(filteredStats);

    // Calculate summary statistics
    const summary = calculateHistoricalSummary(trendData);

    return NextResponse.json({
      trends: trendData,
      summary,
      dataPoints: trendData.length,
      daysRequested: days,
      asinFilter: asinFilter || null,
    });
  } catch (error) {
    console.error('[History Trends] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trends' },
      { status: 500 }
    );
  }
}
