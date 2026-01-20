// Server-side configuration from Vercel KV or environment variables
// This file should only be imported in server components or API routes

import { GitHubConfig } from './github';
import { getConfigFromKV, isKVAvailable } from './kvConfig';

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
 * Get GitHub configuration with priority: KV store → environment variables
 * For server-side use only
 */
export async function getServerConfig(): Promise<GitHubConfig | null> {
  // Try KV store first
  if (isKVAvailable()) {
    const kvConfig = await getConfigFromKV();
    if (kvConfig) {
      return kvConfig;
    }
  }

  // Fallback to environment variables
  return getConfigFromEnv();
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
  if (!adminPassword) {
    return false;
  }
  return password === adminPassword;
}

/**
 * Get config status for display (without exposing token)
 */
export async function getConfigStatus(): Promise<{
  configured: boolean;
  source?: 'kv' | 'env' | 'none';
  repo?: string;
  path?: string;
  updatedAt?: string;
}> {
  // Check KV first
  if (isKVAvailable()) {
    const kvConfig = await getConfigFromKV();
    if (kvConfig) {
      const { getConfigMetadata } = await import('./kvConfig');
      const metadata = await getConfigMetadata();
      return {
        configured: true,
        source: 'kv',
        repo: `${kvConfig.owner}/${kvConfig.repo}`,
        path: kvConfig.path,
        updatedAt: metadata?.updatedAt,
      };
    }
  }

  // Check environment variables
  const envConfig = getConfigFromEnv();
  if (envConfig) {
    return {
      configured: true,
      source: 'env',
      repo: `${envConfig.owner}/${envConfig.repo}`,
      path: envConfig.path,
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
