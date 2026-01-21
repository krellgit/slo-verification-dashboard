import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getServerConfig, getConfigStatus, checkKVAvailability } from '@/lib/serverConfig';
import { validateConfig as validateGitHubConfig, checkRateLimit, listReports as listGitHubReports, GitHubConfig } from '@/lib/github';
import { validateS3Config, listS3Reports } from '@/lib/s3';
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
      // Test connection based on source type
      if (config.source === 's3' && config.s3) {
        const validation = await validateS3Config(config.s3);

        if (validation.valid) {
          connectionStatus = 'connected';

          // Get report count from S3
          try {
            const reports = await listS3Reports(config.s3);
            reportCount = reports.length;
          } catch {
            // Ignore report listing errors
          }
        } else {
          connectionStatus = 'error';
          connectionError = validation.error;
        }
      } else if (config.source === 'github' && config.github) {
        const validation = await validateGitHubConfig(config.github);

        if (validation.valid) {
          connectionStatus = 'connected';

          // Get rate limit info for GitHub
          try {
            const rateLimitInfo = await checkRateLimit(config.github);
            rateLimit = {
              remaining: rateLimitInfo.remaining,
              limit: rateLimitInfo.limit,
              resetAt: rateLimitInfo.resetAt.toISOString(),
            };
          } catch {
            // Ignore rate limit check errors
          }

          // Get report count from GitHub
          try {
            const reports = await listGitHubReports(config.github);
            reportCount = reports.length;
          } catch {
            // Ignore report listing errors
          }
        } else {
          connectionStatus = 'error';
          connectionError = validation.error;
        }
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
        REDIS_URL: !!(process.env.slovd_config_REDIS_URL || process.env.REDIS_URL || process.env.KV_URL),
        AWS_ACCESS_KEY_ID: !!process.env.AWS_ACCESS_KEY_ID,
        AWS_SECRET_ACCESS_KEY: !!process.env.AWS_SECRET_ACCESS_KEY,
        S3_BUCKET: !!process.env.S3_BUCKET,
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
          error: 'Report source not configured. Please configure S3 or GitHub connection.',
        });
      }

      // Test based on source type
      if (config.source === 's3' && config.s3) {
        const validation = await validateS3Config(config.s3);

        if (!validation.valid) {
          return NextResponse.json({
            success: false,
            error: validation.error,
          });
        }

        // List reports from S3
        const reports = await listS3Reports(config.s3);

        return NextResponse.json({
          success: true,
          source: 's3',
          reportCount: reports.length,
          reports: reports.slice(0, 5).map(r => ({ asin: r.asin, name: r.name })),
        });
      } else if (config.source === 'github' && config.github) {
        const validation = await validateGitHubConfig(config.github);

        if (!validation.valid) {
          return NextResponse.json({
            success: false,
            error: validation.error,
          });
        }

        // List reports from GitHub
        const reports = await listGitHubReports(config.github);

        return NextResponse.json({
          success: true,
          source: 'github',
          reportCount: reports.length,
          reports: reports.slice(0, 5).map(r => ({ asin: r.asin, name: r.name })),
        });
      }

      return NextResponse.json({
        success: false,
        error: 'Invalid configuration source',
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
      const connectionValidation = await validateGitHubConfig(newConfig);
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
