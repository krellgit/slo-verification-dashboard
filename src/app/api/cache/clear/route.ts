// POST /api/cache/clear - Clear the reports cache
// Useful after deploying verification rule changes

import { NextResponse } from 'next/server';
import { getRedisClient } from '@/lib/redis';

export async function POST() {
  try {
    const redis = getRedisClient();

    if (!redis) {
      return NextResponse.json({
        success: false,
        message: 'Redis not configured',
      });
    }

    // Clear reports cache
    await redis.del('reports:cached');

    return NextResponse.json({
      success: true,
      message: 'Reports cache cleared successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Cache Clear] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to clear cache',
    }, { status: 500 });
  }
}
