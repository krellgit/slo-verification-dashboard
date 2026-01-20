// Vercel KV storage for dynamic GitHub configuration
// Server-side only

import { kv } from '@vercel/kv';
import { GitHubConfig } from './github';

const KV_CONFIG_KEY = 'slovd:github_config';

export interface StoredConfig {
  config: GitHubConfig;
  metadata: {
    updatedAt: string;
    updatedBy?: string;
    version: number;
  };
}

export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Check if Vercel KV is available (env vars set)
 */
export function isKVAvailable(): boolean {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

/**
 * Validate configuration input before saving
 */
export function validateConfigInput(input: {
  owner?: string;
  repo?: string;
  token?: string;
  path?: string;
}): { valid: boolean; errors: ValidationError[] } {
  const errors: ValidationError[] = [];

  // Validate owner
  if (!input.owner || input.owner.trim() === '') {
    errors.push({ field: 'owner', message: 'Owner is required' });
  } else if (!/^[a-zA-Z0-9_-]+$/.test(input.owner)) {
    errors.push({ field: 'owner', message: 'Owner contains invalid characters' });
  }

  // Validate repo
  if (!input.repo || input.repo.trim() === '') {
    errors.push({ field: 'repo', message: 'Repository name is required' });
  } else if (!/^[a-zA-Z0-9_.-]+$/.test(input.repo)) {
    errors.push({ field: 'repo', message: 'Repository name contains invalid characters' });
  }

  // Validate token
  if (!input.token || input.token.trim() === '') {
    errors.push({ field: 'token', message: 'GitHub token is required' });
  } else if (input.token.length < 20) {
    errors.push({ field: 'token', message: 'Token appears to be invalid (too short)' });
  }

  // Validate path (optional)
  if (input.path && input.path.trim() !== '') {
    if (!/^[a-zA-Z0-9_.\/-]+$/.test(input.path)) {
      errors.push({ field: 'path', message: 'Path contains invalid characters' });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Save configuration to Vercel KV
 */
export async function saveConfigToKV(
  config: GitHubConfig,
  updatedBy?: string
): Promise<void> {
  if (!isKVAvailable()) {
    throw new Error('Vercel KV is not configured');
  }

  // Validate input
  const validation = validateConfigInput(config);
  if (!validation.valid) {
    throw new Error(`Invalid configuration: ${validation.errors.map(e => e.message).join(', ')}`);
  }

  const storedConfig: StoredConfig = {
    config: {
      owner: config.owner.trim(),
      repo: config.repo.trim(),
      token: config.token.trim(),
      path: config.path?.trim() || 'reports',
    },
    metadata: {
      updatedAt: new Date().toISOString(),
      updatedBy,
      version: 1,
    },
  };

  await kv.set(KV_CONFIG_KEY, storedConfig);
}

/**
 * Get configuration from Vercel KV
 */
export async function getConfigFromKV(): Promise<GitHubConfig | null> {
  if (!isKVAvailable()) {
    return null;
  }

  try {
    const stored = await kv.get<StoredConfig>(KV_CONFIG_KEY);
    if (!stored) {
      return null;
    }

    return stored.config;
  } catch (error) {
    console.error('Error fetching config from KV:', error);
    return null;
  }
}

/**
 * Get configuration metadata (without exposing token)
 */
export async function getConfigMetadata(): Promise<StoredConfig['metadata'] | null> {
  if (!isKVAvailable()) {
    return null;
  }

  try {
    const stored = await kv.get<StoredConfig>(KV_CONFIG_KEY);
    if (!stored) {
      return null;
    }

    return stored.metadata;
  } catch (error) {
    console.error('Error fetching config metadata from KV:', error);
    return null;
  }
}

/**
 * Delete configuration from Vercel KV
 */
export async function deleteConfigFromKV(): Promise<void> {
  if (!isKVAvailable()) {
    throw new Error('Vercel KV is not configured');
  }

  await kv.del(KV_CONFIG_KEY);
}
