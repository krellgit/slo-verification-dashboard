// Redis client utility using ioredis
// Connects to Redis Cloud instance via slovd_config_REDIS_URL

import Redis from 'ioredis';

const redisUrl = process.env.slovd_config_REDIS_URL;

let redis: Redis | null = null;

export function getRedisClient(): Redis | null {
  if (!redisUrl) {
    console.warn('[Redis] No slovd_config_REDIS_URL configured');
    return null;
  }

  if (!redis) {
    redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    redis.on('error', (err) => {
      console.error('[Redis] Connection error:', err.message);
    });

    redis.on('connect', () => {
      console.log('[Redis] Connected successfully');
    });
  }

  return redis;
}
