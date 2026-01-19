// GitHub API Service for fetching JSON reports from a private repository

const STORAGE_KEY = 'slovd_github_config';
const GITHUB_API_BASE = 'https://api.github.com';

export interface GitHubConfig {
  token: string;
  owner: string;
  repo: string;
  path?: string; // directory path, default "reports"
}

export interface ReportFile {
  name: string;      // e.g., "B0DQ196WLW.json"
  asin: string;      // extracted from filename
  path: string;      // full path in repo
  sha: string;       // for caching
  size: number;
}

export interface GitHubError {
  message: string;
  status?: number;
  rateLimitReset?: Date;
}

// Type guard for GitHub API file response
interface GitHubFileItem {
  name: string;
  path: string;
  sha: string;
  size: number;
  type: 'file' | 'dir';
  download_url?: string;
}

interface GitHubContentResponse {
  content?: string;
  encoding?: string;
  sha: string;
  name: string;
  path: string;
  size: number;
}

interface GitHubRateLimitResponse {
  resources: {
    core: {
      limit: number;
      remaining: number;
      reset: number;
    };
  };
}

/**
 * Save GitHub configuration to localStorage
 */
export function saveConfig(config: GitHubConfig): void {
  if (typeof window === 'undefined') {
    throw new Error('saveConfig requires browser environment');
  }

  const configToSave = {
    ...config,
    path: config.path || 'reports'
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(configToSave));
}

/**
 * Get GitHub configuration from localStorage
 */
export function getConfig(): GitHubConfig | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    return null;
  }

  try {
    return JSON.parse(stored) as GitHubConfig;
  } catch {
    return null;
  }
}

/**
 * Clear GitHub configuration from localStorage
 */
export function clearConfig(): void {
  if (typeof window === 'undefined') {
    return;
  }
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Check if we have a valid configuration
 */
export function hasValidConfig(): boolean {
  const config = getConfig();
  return !!(config?.token && config?.owner && config?.repo);
}

/**
 * Parse owner/repo from various URL formats
 * Accepts: "owner/repo", "https://github.com/owner/repo", etc.
 */
export function parseRepoUrl(input: string): { owner: string; repo: string } | null {
  // Try direct owner/repo format
  const directMatch = input.match(/^([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_.-]+)$/);
  if (directMatch) {
    return { owner: directMatch[1], repo: directMatch[2] };
  }

  // Try GitHub URL format
  const urlMatch = input.match(/github\.com[/:]([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_.-]+)/);
  if (urlMatch) {
    // Remove .git suffix if present
    const repo = urlMatch[2].replace(/\.git$/, '');
    return { owner: urlMatch[1], repo };
  }

  return null;
}

/**
 * Extract ASIN from filename
 * Assumes format like "B0DQ196WLW.json" or "report_B0DQ196WLW.json"
 */
function extractAsin(filename: string): string {
  // ASIN pattern: 10 alphanumeric characters, typically starting with B0
  const asinMatch = filename.match(/\b(B[A-Z0-9]{9})\b/i);
  if (asinMatch) {
    return asinMatch[1].toUpperCase();
  }
  // Fallback: use filename without extension
  return filename.replace(/\.json$/i, '');
}

/**
 * Make authenticated request to GitHub API
 */
async function githubFetch<T>(
  endpoint: string,
  config: GitHubConfig,
  options: RequestInit = {}
): Promise<T> {
  const url = `${GITHUB_API_BASE}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${config.token}`,
      'Accept': 'application/vnd.github.v3+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...options.headers,
    },
  });

  // Handle rate limiting
  if (response.status === 403) {
    const rateLimitRemaining = response.headers.get('X-RateLimit-Remaining');
    const rateLimitReset = response.headers.get('X-RateLimit-Reset');

    if (rateLimitRemaining === '0' && rateLimitReset) {
      const resetDate = new Date(parseInt(rateLimitReset) * 1000);
      const error: GitHubError = {
        message: `GitHub API rate limit exceeded. Resets at ${resetDate.toLocaleTimeString()}`,
        status: 403,
        rateLimitReset: resetDate,
      };
      throw error;
    }
  }

  // Handle other errors
  if (!response.ok) {
    let errorMessage = `GitHub API error: ${response.status} ${response.statusText}`;
    try {
      const errorBody = await response.json();
      if (errorBody.message) {
        errorMessage = errorBody.message;
      }
    } catch {
      // Ignore JSON parse errors
    }

    const error: GitHubError = {
      message: errorMessage,
      status: response.status,
    };
    throw error;
  }

  return response.json();
}

/**
 * List all JSON report files in the configured directory
 */
export async function listReports(configOverride?: GitHubConfig): Promise<ReportFile[]> {
  const config = configOverride || getConfig();
  if (!config) {
    throw new Error('GitHub configuration not found. Please configure repository settings.');
  }

  const dirPath = config.path || 'reports';
  const endpoint = `/repos/${config.owner}/${config.repo}/contents/${dirPath}`;

  const contents = await githubFetch<GitHubFileItem[]>(endpoint, config);

  // Filter for JSON files only
  const jsonFiles = contents.filter(
    (item) => item.type === 'file' && item.name.toLowerCase().endsWith('.json')
  );

  return jsonFiles.map((file) => ({
    name: file.name,
    asin: extractAsin(file.name),
    path: file.path,
    sha: file.sha,
    size: file.size,
  }));
}

/**
 * Fetch the content of a single report file
 */
export async function fetchReport(path: string, configOverride?: GitHubConfig): Promise<unknown> {
  const config = configOverride || getConfig();
  if (!config) {
    throw new Error('GitHub configuration not found. Please configure repository settings.');
  }

  const endpoint = `/repos/${config.owner}/${config.repo}/contents/${path}`;

  const response = await githubFetch<GitHubContentResponse>(endpoint, config);

  if (!response.content || response.encoding !== 'base64') {
    throw new Error('Unexpected response format from GitHub API');
  }

  // Decode base64 content
  const decoded = atob(response.content);

  // Parse JSON
  try {
    return JSON.parse(decoded);
  } catch (e) {
    throw new Error(`Failed to parse JSON content: ${e instanceof Error ? e.message : 'Unknown error'}`);
  }
}

/**
 * Fetch raw file content as string (for non-JSON files or debugging)
 */
export async function fetchRawContent(path: string, configOverride?: GitHubConfig): Promise<string> {
  const config = configOverride || getConfig();
  if (!config) {
    throw new Error('GitHub configuration not found. Please configure repository settings.');
  }

  const endpoint = `/repos/${config.owner}/${config.repo}/contents/${path}`;

  const response = await githubFetch<GitHubContentResponse>(endpoint, config);

  if (!response.content || response.encoding !== 'base64') {
    throw new Error('Unexpected response format from GitHub API');
  }

  return atob(response.content);
}

/**
 * Check rate limit status
 */
export async function checkRateLimit(configOverride?: GitHubConfig): Promise<{
  remaining: number;
  limit: number;
  resetAt: Date;
}> {
  const config = configOverride || getConfig();
  if (!config) {
    throw new Error('GitHub configuration not found.');
  }

  const response = await githubFetch<GitHubRateLimitResponse>('/rate_limit', config);

  return {
    remaining: response.resources.core.remaining,
    limit: response.resources.core.limit,
    resetAt: new Date(response.resources.core.reset * 1000),
  };
}

/**
 * Validate the current configuration by making a test API call
 */
export async function validateConfig(configOverride?: GitHubConfig): Promise<{
  valid: boolean;
  error?: string;
}> {
  const config = configOverride || getConfig();
  if (!config) {
    return { valid: false, error: 'No configuration found' };
  }

  try {
    // Try to access the repository
    const endpoint = `/repos/${config.owner}/${config.repo}`;
    await githubFetch<unknown>(endpoint, config);

    // If path is specified, also validate it exists
    if (config.path) {
      try {
        const contentsEndpoint = `/repos/${config.owner}/${config.repo}/contents/${config.path}`;
        await githubFetch<unknown>(contentsEndpoint, config);
      } catch (e) {
        const error = e as GitHubError;
        if (error.status === 404) {
          return {
            valid: false,
            error: `Directory "${config.path}" not found in repository`
          };
        }
        throw e;
      }
    }

    return { valid: true };
  } catch (e) {
    const error = e as GitHubError;
    if (error.status === 401) {
      return { valid: false, error: 'Invalid or expired token' };
    }
    if (error.status === 404) {
      return { valid: false, error: 'Repository not found (check owner/repo and token permissions)' };
    }
    return { valid: false, error: error.message };
  }
}
