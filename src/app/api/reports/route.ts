import { NextResponse } from 'next/server';
import { getServerConfig, getConfigStatus } from '@/lib/serverConfig';
import { listReports, fetchReport, GitHubConfig } from '@/lib/github';
import { parseReport } from '@/lib/reportParser';
import { verify } from '@/lib/verificationEngine';
import { aggregateStats } from '@/lib/statsAggregator';
import { VerificationResult } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/reports - Get all reports with verification results
 * Public endpoint - uses server-side GitHub config
 */
export async function GET() {
  try {
    const config = getServerConfig();

    if (!config) {
      const status = getConfigStatus();
      return NextResponse.json({
        configured: false,
        error: 'GitHub repository not configured. Admin must set environment variables.',
        status,
      }, { status: 503 });
    }

    // Fetch list of reports from GitHub
    const reportFiles = await listReports(config);

    if (reportFiles.length === 0) {
      return NextResponse.json({
        configured: true,
        reports: [],
        stats: null,
        message: 'No JSON reports found in the configured directory',
      });
    }

    // Fetch and verify each report
    const verificationResults: VerificationResult[] = [];
    const errors: Array<{ asin: string; error: string }> = [];

    for (const file of reportFiles) {
      try {
        const rawContent = await fetchReport(file.path, config);
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

    return NextResponse.json({
      configured: true,
      reports: verificationResults,
      stats,
      errors: errors.length > 0 ? errors : undefined,
      meta: {
        totalFiles: reportFiles.length,
        processedFiles: verificationResults.length,
        failedFiles: errors.length,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Reports API error:', error);

    // Handle GitHub-specific errors
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isRateLimit = errorMessage.includes('rate limit');
    const isAuthError = errorMessage.includes('401') || errorMessage.includes('token');

    return NextResponse.json({
      configured: true,
      error: errorMessage,
      errorType: isRateLimit ? 'rate_limit' : isAuthError ? 'auth' : 'unknown',
    }, {
      status: isRateLimit ? 429 : isAuthError ? 401 : 500
    });
  }
}
