import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getServerConfig, getConfigStatus } from '@/lib/serverConfig';
import { validateConfig, checkRateLimit, listReports } from '@/lib/github';

const SESSION_COOKIE = 'slovd_admin_session';

/**
 * Check if request is authenticated
 */
async function isAuthenticated(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get(SESSION_COOKIE);

    if (!session?.value) {
      return false;
    }

    const [, expiresAt] = session.value.split(':');
    const expiry = parseInt(expiresAt, 10);

    return !isNaN(expiry) && Date.now() <= expiry;
  } catch {
    return false;
  }
}

/**
 * GET /api/admin/config - Get configuration status (protected)
 */
export async function GET() {
  // Check authentication
  if (!(await isAuthenticated())) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const status = getConfigStatus();
    const config = getServerConfig();

    let connectionStatus: 'connected' | 'error' | 'not_configured' = 'not_configured';
    let connectionError: string | undefined;
    let rateLimit: { remaining: number; limit: number; resetAt: string } | undefined;
    let reportCount: number | undefined;

    if (config) {
      // Test the connection
      const validation = await validateConfig(config);

      if (validation.valid) {
        connectionStatus = 'connected';

        // Get rate limit info
        try {
          const rateLimitInfo = await checkRateLimit(config);
          rateLimit = {
            remaining: rateLimitInfo.remaining,
            limit: rateLimitInfo.limit,
            resetAt: rateLimitInfo.resetAt.toISOString(),
          };
        } catch {
          // Ignore rate limit check errors
        }

        // Get report count
        try {
          const reports = await listReports(config);
          reportCount = reports.length;
        } catch {
          // Ignore report listing errors
        }
      } else {
        connectionStatus = 'error';
        connectionError = validation.error;
      }
    }

    return NextResponse.json({
      ...status,
      connectionStatus,
      connectionError,
      rateLimit,
      reportCount,
      envVarsConfigured: {
        GITHUB_TOKEN: !!process.env.GITHUB_TOKEN,
        GITHUB_REPO: !!process.env.GITHUB_REPO,
        REPORTS_PATH: !!process.env.REPORTS_PATH,
        ADMIN_PASSWORD: !!process.env.ADMIN_PASSWORD,
      },
    });
  } catch (error) {
    console.error('Config API error:', error);
    return NextResponse.json(
      { error: 'Failed to get configuration status' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/config/test - Test connection (protected)
 */
export async function POST() {
  // Check authentication
  if (!(await isAuthenticated())) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const config = getServerConfig();

    if (!config) {
      return NextResponse.json({
        success: false,
        error: 'GitHub configuration not set. Please configure environment variables.',
      });
    }

    const validation = await validateConfig(config);

    if (!validation.valid) {
      return NextResponse.json({
        success: false,
        error: validation.error,
      });
    }

    // Also try to list reports
    const reports = await listReports(config);

    return NextResponse.json({
      success: true,
      reportCount: reports.length,
      reports: reports.slice(0, 5).map(r => ({ asin: r.asin, name: r.name })),
    });
  } catch (error) {
    console.error('Config test error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
