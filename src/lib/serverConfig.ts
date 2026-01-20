// Server-side configuration from environment variables
// This file should only be imported in server components or API routes

import { GitHubConfig } from './github';

/**
 * Get GitHub configuration from environment variables
 * For server-side use only
 */
export function getServerConfig(): GitHubConfig | null {
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
 * Check if server config is available
 */
export function hasServerConfig(): boolean {
  return getServerConfig() !== null;
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
export function getConfigStatus(): {
  configured: boolean;
  repo?: string;
  path?: string;
} {
  const config = getServerConfig();
  if (!config) {
    return { configured: false };
  }

  return {
    configured: true,
    repo: `${config.owner}/${config.repo}`,
    path: config.path,
  };
}
