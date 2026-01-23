import { NextResponse } from 'next/server';
import { getServerConfig, getConfigStatus } from '@/lib/serverConfig';
import { listReports as listGitHubReports, fetchReport as fetchGitHubReport } from '@/lib/github';
import { listS3Reports, fetchS3Report } from '@/lib/s3';
import { parseReport } from '@/lib/reportParser';
import { verify } from '@/lib/verificationEngine';
import { aggregateStats } from '@/lib/statsAggregator';
import { VerificationResult } from '@/lib/types';
import { getRedisClient } from '@/lib/redis';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Cache key and TTL (5 minutes)
const CACHE_KEY = 'reports:cached';
const CACHE_TTL = 5 * 60; // 5 minutes in seconds

interface CachedReportsData {
  reports: VerificationResult[];
  stats: ReturnType<typeof aggregateStats>;
  errors?: Array<{ asin: string; error: string }>;
  meta: {
    totalFiles: number;
    processedFiles: number;
    failedFiles: number;
    timestamp: string;
    source: string;
  };
}

/**
 * GET /api/reports - Get all reports with verification results
 * Public endpoint - uses server-side config (GitHub or S3)
 * Results are cached in Redis for 5 minutes
 */
export async function GET() {
  try {
    // Try to get cached data first
    const redis = getRedisClient();
    if (redis) {
      try {
        const cached = await redis.get(CACHE_KEY);
        if (cached) {
          const data: CachedReportsData = JSON.parse(cached);
          return NextResponse.json({
            configured: true,
            ...data,
            cached: true,
          });
        }
      } catch (cacheErr) {
        console.warn('[Reports] Cache read failed:', cacheErr);
      }
    }

    const config = await getServerConfig();

    if (!config) {
      const status = await getConfigStatus();
      return NextResponse.json({
        configured: false,
        error: 'Report source not configured. Admin must configure GitHub or S3 connection.',
        status,
      }, { status: 503 });
    }

    // Fetch list of reports based on source
    let reportFiles: Array<{ name: string; asin: string; path?: string; key?: string }> = [];

    if (config.source === 's3' && config.s3) {
      const s3Files = await listS3Reports(config.s3);
      reportFiles = s3Files.map(f => ({
        name: f.name,
        asin: f.asin,
        key: f.key,
      }));
    } else if (config.source === 'github' && config.github) {
      const githubFiles = await listGitHubReports(config.github);
      reportFiles = githubFiles.map(f => ({
        name: f.name,
        asin: f.asin,
        path: f.path,
      }));
    }

    if (reportFiles.length === 0) {
      return NextResponse.json({
        configured: true,
        reports: [],
        stats: null,
        message: 'No JSON reports found in the configured location',
      });
    }

    // Fetch and verify each report
    const verificationResults: VerificationResult[] = [];
    const errors: Array<{ asin: string; error: string }> = [];

    for (const file of reportFiles) {
      try {
        let rawContent: unknown;

        // Fetch based on source
        if (config.source === 's3' && config.s3 && file.key) {
          rawContent = await fetchS3Report(file.key, config.s3);
        } else if (config.source === 'github' && config.github && file.path) {
          rawContent = await fetchGitHubReport(file.path, config.github);
        } else {
          throw new Error('Invalid file or config');
        }

        const parsed = parseReport(rawContent, file.asin);
        const result = verify(parsed);
        verificationResults.push(result);
      } catch (error) {
        errors.push({
          asin: file.asin,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Aggregate statistics
    const stats = aggregateStats(verificationResults);

    const responseData: CachedReportsData = {
      reports: verificationResults,
      stats,
      errors: errors.length > 0 ? errors : undefined,
      meta: {
        totalFiles: reportFiles.length,
        processedFiles: verificationResults.length,
        failedFiles: errors.length,
        timestamp: new Date().toISOString(),
        source: config.source,
      },
    };

    // Cache the results in Redis
    if (redis) {
      try {
        await redis.set(CACHE_KEY, JSON.stringify(responseData));
        await redis.expire(CACHE_KEY, CACHE_TTL);
      } catch (cacheErr) {
        console.warn('[Reports] Cache write failed:', cacheErr);
      }
    }

    return NextResponse.json({
      configured: true,
      ...responseData,
      cached: false,
    });
  } catch (error) {
    console.error('Reports API error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isRateLimit = errorMessage.includes('rate limit');
    const isAuthError = errorMessage.includes('401') || errorMessage.includes('token') || errorMessage.includes('AccessDenied');

    return NextResponse.json({
      configured: true,
      error: errorMessage,
      errorType: isRateLimit ? 'rate_limit' : isAuthError ? 'auth' : 'unknown',
    }, {
      status: isRateLimit ? 429 : isAuthError ? 401 : 500
    });
  }
}
