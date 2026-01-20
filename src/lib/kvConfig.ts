// Vercel KV storage for dynamic GitHub configuration
// Server-side only

import Redis from 'ioredis';
import { GitHubConfig } from './github';

const KV_CONFIG_KEY = 'slovd:github_config';

// Create Redis client using the connection URL
let redis: Redis | null = null;

function getRedisClient(): Redis | null {
  if (redis) return redis;

  const redisUrl = process.env.slovd_config_REDIS_URL || process.env.REDIS_URL || process.env.KV_URL;

  if (!redisUrl) {
    return null;
  }

  try {
    redis = new Redis(redisUrl, {
      // Disable retries for faster failure detection
      retryStrategy: () => null,
      // Set connection timeout
      connectTimeout: 5000,
      // Lazy connect - only connect when first command is issued
      lazyConnect: true,
    });

    // Handle connection errors
    redis.on('error', (err) => {
      console.error('Redis connection error:', err);
    });

    return redis;
  } catch (error) {
    console.error('Failed to create Redis client:', error);
    return null;
  }
}

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
  return !!(
    process.env.slovd_config_REDIS_URL ||
    process.env.REDIS_URL ||
    process.env.KV_URL
  );
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
  const client = getRedisClient();

  if (!client || !isKVAvailable()) {
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

  try {
    // Ensure client is connected
    if (client.status !== 'ready') {
      await client.connect();
    }

    // Store as JSON string in Redis
    await client.set(KV_CONFIG_KEY, JSON.stringify(storedConfig));
  } catch (error) {
    console.error('Error saving to Redis:', error);
    throw new Error('Failed to save configuration to KV store');
  }
}

/**
 * Get configuration from Vercel KV
 */
export async function getConfigFromKV(): Promise<GitHubConfig | null> {
  const client = getRedisClient();

  if (!client || !isKVAvailable()) {
    return null;
  }

  try {
    // Ensure client is connected
    if (client.status !== 'ready') {
      await client.connect();
    }

    const data = await client.get(KV_CONFIG_KEY);

    if (!data) {
      return null;
    }

    const stored: StoredConfig = JSON.parse(data);
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
  const client = getRedisClient();

  if (!client || !isKVAvailable()) {
    return null;
  }

  try {
    // Ensure client is connected
    if (client.status !== 'ready') {
      await client.connect();
    }

    const data = await client.get(KV_CONFIG_KEY);

    if (!data) {
      return null;
    }

    const stored: StoredConfig = JSON.parse(data);
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
  const client = getRedisClient();

  if (!client || !isKVAvailable()) {
    throw new Error('Vercel KV is not configured');
  }

  try {
    // Ensure client is connected
    if (client.status !== 'ready') {
      await client.connect();
    }

    await client.del(KV_CONFIG_KEY);
  } catch (error) {
    console.error('Error deleting config from KV:', error);
    throw new Error('Failed to delete configuration from KV store');
  }
}
