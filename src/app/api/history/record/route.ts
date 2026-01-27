// POST /api/history/record
// Records daily verification statistics for historical tracking
// If AWS fails (empty reports), carries forward yesterday's data

import { NextRequest, NextResponse } from 'next/server';
import { calculateDailyStats, getDailyStatsKey, getYesterdayDate, type DailyStats } from '@/lib/history';
import { getRedisClient } from '@/lib/redis';

// In-memory fallback (only for development/testing when Redis unavailable)
const memoryStore = new Map<string, DailyStats>();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { reports, date, force } = body;
    const targetDate = date || new Date().toISOString().split('T')[0];
    const key = getDailyStatsKey(targetDate);

    // Store in Redis or fallback to memory
    const redis = getRedisClient();

    // Check if today's data already exists (skip if not forcing)
    if (!force) {
      try {
        let existing: string | null = null;
        if (redis) {
          existing = await redis.get(key);
        } else {
          const memData = memoryStore.get(key);
          existing = memData ? JSON.stringify(memData) : null;
        }

        if (existing) {
          const existingStats = JSON.parse(existing) as DailyStats;
          return NextResponse.json({
            success: true,
            date: targetDate,
            passRate: existingStats.passRate,
            stored: redis ? 'redis' : 'memory',
            skipped: true,
            carriedForward: existingStats.carriedForward,
            message: 'Data already recorded for today',
          });
        }
      } catch (checkErr) {
        console.warn('[History Record] Check existing failed:', checkErr);
      }
    }

    let stats: DailyStats;
    let carriedForward = false;

    // If reports empty/null (AWS failed), carry forward yesterday's data
    if (!reports || !Array.isArray(reports) || reports.length === 0) {
      console.log('[History Record] No reports provided, attempting to carry forward yesterday\'s data');

      const yesterdayDate = getYesterdayDate(targetDate);
      const yesterdayKey = getDailyStatsKey(yesterdayDate);

      let yesterdayData: string | null = null;
      if (redis) {
        yesterdayData = await redis.get(yesterdayKey);
      } else {
        const memData = memoryStore.get(yesterdayKey);
        yesterdayData = memData ? JSON.stringify(memData) : null;
      }

      if (yesterdayData) {
        const yesterdayStats = JSON.parse(yesterdayData) as DailyStats;
        stats = {
          ...yesterdayStats,
          date: targetDate,
          timestamp: new Date().toISOString(),
          carriedForward: true,
        };
        carriedForward = true;
        console.log(`[History Record] Carried forward data from ${yesterdayDate}`);
      } else {
        return NextResponse.json({
          success: false,
          error: 'No reports provided and no previous data to carry forward',
        }, { status: 400 });
      }
    } else {
      // Calculate stats from provided reports
      stats = calculateDailyStats(reports, targetDate);
    }

    // Store the data
    if (redis) {
      await redis.set(key, JSON.stringify(stats));
      // Set 90-day expiration
      await redis.expire(key, 90 * 24 * 60 * 60);
    } else {
      memoryStore.set(key, stats);
    }

    return NextResponse.json({
      success: true,
      date: stats.date,
      passRate: stats.passRate,
      stored: redis ? 'redis' : 'memory',
      skipped: false,
      carriedForward,
    });
  } catch (error) {
    console.error('[History Record] Error:', error);
    return NextResponse.json(
      { error: 'Failed to record history' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const key = getDailyStatsKey(date);

    let stats: DailyStats | null = null;

    const redis = getRedisClient();
    if (redis) {
      const data = await redis.get(key);
      stats = data ? JSON.parse(data) : null;
    } else {
      stats = memoryStore.get(key) || null;
    }

    if (!stats) {
      return NextResponse.json(
        { error: 'No data found for date' },
        { status: 404 }
      );
    }

    return NextResponse.json(stats);
  } catch (error) {
    console.error('[History Record GET] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch history' },
      { status: 500 }
    );
  }
}
