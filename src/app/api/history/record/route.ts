// POST /api/history/record
// Records daily verification statistics for historical tracking

import { NextRequest, NextResponse } from 'next/server';
import { calculateDailyStats, getDailyStatsKey, type DailyStats } from '@/lib/history';
import { getRedisClient } from '@/lib/redis';

// In-memory fallback (only for development/testing when Redis unavailable)
const memoryStore = new Map<string, DailyStats>();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { reports, date } = body;

    if (!reports || !Array.isArray(reports)) {
      return NextResponse.json(
        { error: 'Invalid request: reports array required' },
        { status: 400 }
      );
    }

    // Calculate stats
    const stats = calculateDailyStats(reports, date);
    const key = getDailyStatsKey(stats.date);

    // Store in Redis or fallback to memory
    const redis = getRedisClient();
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
