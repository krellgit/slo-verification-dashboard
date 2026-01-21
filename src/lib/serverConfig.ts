// Server-side configuration from Vercel KV or environment variables
// This file should only be imported in server components or API routes

import { GitHubConfig } from './github';
import { S3Config, hasS3Config } from './s3';
import { getConfigFromKV, isKVAvailable } from './kvConfig';

export type ReportSource = 'github' | 's3';

export interface ServerConfig {
  source: ReportSource;
  github?: GitHubConfig;
  s3?: S3Config;
}

/**
 * Get GitHub configuration from environment variables (fallback)
 */
function getConfigFromEnv(): GitHubConfig | null {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO; // format: "owner/repo"
  const path = process.env.REPORTS_PATH || 'reports';

  if (!token || !repo) {
    return null;
  }

  // Parse owner/repo
  const match = repo.match(/^([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_.-]+)$/);
  if (!match) {
    console.error('Invalid GITHUB_REPO format. Expected "owner/repo"');
    return null;
  }

  return {
    token,
    owner: match[1],
    repo: match[2],
    path,
  };
}

/**
 * Get S3 configuration from environment variables
 */
function getS3ConfigFromEnv(): S3Config | null {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const region = process.env.AWS_REGION || 'us-east-1';
  const bucket = process.env.S3_BUCKET;
  const prefix = process.env.S3_PREFIX || '';

  if (!accessKeyId || !secretAccessKey || !bucket) {
    return null;
  }

  return {
    accessKeyId,
    secretAccessKey,
    region,
    bucket,
    prefix,
  };
}

/**
 * Get server configuration with priority: S3 → KV store → GitHub environment variables
 * For server-side use only
 */
export async function getServerConfig(): Promise<ServerConfig | null> {
  // Priority 1: Try S3 if configured
  if (hasS3Config()) {
    const s3Config = getS3ConfigFromEnv();
    if (s3Config) {
      return {
        source: 's3',
        s3: s3Config,
      };
    }
  }

  // Priority 2: Try KV store (GitHub config)
  if (isKVAvailable()) {
    const kvConfig = await getConfigFromKV();
    if (kvConfig) {
      return {
        source: 'github',
        github: kvConfig,
      };
    }
  }

  // Priority 3: Fallback to GitHub environment variables
  const githubConfig = getConfigFromEnv();
  if (githubConfig) {
    return {
      source: 'github',
      github: githubConfig,
    };
  }

  return null;
}

/**
 * Check if server config is available
 */
export async function hasServerConfig(): Promise<boolean> {
  const config = await getServerConfig();
  return config !== null;
}

/**
 * Get admin password from environment
 */
export function getAdminPassword(): string | null {
  return process.env.ADMIN_PASSWORD || null;
}

/**
 * Verify admin password
 */
export function verifyAdminPassword(password: string): boolean {
  const adminPassword = getAdminPassword();
  console.log('[DEBUG] Admin password check:', {
    hasAdminPassword: !!adminPassword,
    adminPasswordLength: adminPassword?.length,
    inputPasswordLength: password.length,
    match: password === adminPassword,
  });
  if (!adminPassword) {
    return false;
  }
  return password === adminPassword;
}

/**
 * Get config status for display (without exposing credentials)
 */
export async function getConfigStatus(): Promise<{
  configured: boolean;
  source?: 's3' | 'kv' | 'env' | 'none';
  location?: string; // S3 bucket/prefix or GitHub repo
  path?: string;
  updatedAt?: string;
}> {
  const config = await getServerConfig();

  if (!config) {
    return {
      configured: false,
      source: 'none',
    };
  }

  if (config.source === 's3' && config.s3) {
    return {
      configured: true,
      source: 's3',
      location: `s3://${config.s3.bucket}/${config.s3.prefix}`,
      path: config.s3.prefix,
    };
  }

  if (config.source === 'github' && config.github) {
    // Check if it came from KV or env
    if (isKVAvailable()) {
      const kvConfig = await getConfigFromKV();
      if (kvConfig) {
        const { getConfigMetadata } = await import('./kvConfig');
        const metadata = await getConfigMetadata();
        return {
          configured: true,
          source: 'kv',
          location: `${kvConfig.owner}/${kvConfig.repo}`,
          path: kvConfig.path,
          updatedAt: metadata?.updatedAt,
        };
      }
    }

    return {
      configured: true,
      source: 'env',
      location: `${config.github.owner}/${config.github.repo}`,
      path: config.github.path,
    };
  }

  return {
    configured: false,
    source: 'none',
  };
}

/**
 * Check if Vercel KV is available
 */
export function checkKVAvailability(): boolean {
  return isKVAvailable();
}
