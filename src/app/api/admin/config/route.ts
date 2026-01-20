import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getServerConfig, getConfigStatus, checkKVAvailability } from '@/lib/serverConfig';
import { validateConfig, checkRateLimit, listReports, GitHubConfig } from '@/lib/github';
import { saveConfigToKV, deleteConfigFromKV, validateConfigInput } from '@/lib/kvConfig';

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
    const status = await getConfigStatus();
    const config = await getServerConfig();
    const kvAvailable = checkKVAvailability();

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
      kvAvailable,
      envVarsConfigured: {
        GITHUB_TOKEN: !!process.env.GITHUB_TOKEN,
        GITHUB_REPO: !!process.env.GITHUB_REPO,
        REPORTS_PATH: !!process.env.REPORTS_PATH,
        ADMIN_PASSWORD: !!process.env.ADMIN_PASSWORD,
        KV_REST_API_URL: !!process.env.KV_REST_API_URL,
        KV_REST_API_TOKEN: !!process.env.KV_REST_API_TOKEN,
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
 * POST /api/admin/config - Test or save configuration (protected)
 */
export async function POST(request: Request) {
  // Check authentication
  if (!(await isAuthenticated())) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { action, owner, repo, path, token } = body;

    // Handle test action (existing functionality)
    if (action === 'test' || !action) {
      const config = await getServerConfig();

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
    }

    // Handle save action (new functionality)
    if (action === 'save') {
      // Check if KV is available
      if (!checkKVAvailability()) {
        return NextResponse.json({
          success: false,
          error: 'Vercel KV is not configured. Please set KV_REST_API_URL and KV_REST_API_TOKEN environment variables.',
        });
      }

      // Validate input
      const validation = validateConfigInput({ owner, repo, token, path });
      if (!validation.valid) {
        return NextResponse.json({
          success: false,
          error: validation.errors[0].message,
          validationErrors: validation.errors,
        });
      }

      // Create config object
      const newConfig: GitHubConfig = {
        owner: owner.trim(),
        repo: repo.trim(),
        token: token.trim(),
        path: path?.trim() || 'reports',
      };

      // Test connection first
      const connectionValidation = await validateConfig(newConfig);
      if (!connectionValidation.valid) {
        return NextResponse.json({
          success: false,
          error: `Connection test failed: ${connectionValidation.error}`,
        });
      }

      // Save to KV
      await saveConfigToKV(newConfig, 'admin');

      return NextResponse.json({
        success: true,
        message: 'Configuration saved successfully',
      });
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid action. Use "test" or "save".',
    });
  } catch (error) {
    console.error('Config API error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * DELETE /api/admin/config - Clear KV configuration (protected)
 */
export async function DELETE() {
  // Check authentication
  if (!(await isAuthenticated())) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    // Check if KV is available
    if (!checkKVAvailability()) {
      return NextResponse.json({
        success: false,
        error: 'Vercel KV is not configured.',
      });
    }

    // Delete config from KV
    await deleteConfigFromKV();

    return NextResponse.json({
      success: true,
      message: 'Configuration cleared. Falling back to environment variables.',
    });
  } catch (error) {
    console.error('Config delete error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
