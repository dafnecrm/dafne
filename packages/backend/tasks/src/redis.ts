import type { ConnectionOptions } from 'bullmq';

/** The Redis of the queue when REDIS_URL isn't set (compose.yaml's, in development). */
export const DEFAULT_REDIS_URL = 'redis://localhost:6379';

/**
 * BullMQ's connection to the Redis at `url` (ioredis). Workers need
 * `maxRetriesPerRequest: null`: their blocking commands wait for jobs.
 */
export function redisConnection(url: string | undefined): ConnectionOptions {
  return { url: url || DEFAULT_REDIS_URL, maxRetriesPerRequest: null };
}
