import { Redis } from 'ioredis';

/** Redis key prefix for all BullMQ keys, so queues never collide with cache keys. */
export const DEFAULT_QUEUE_PREFIX = 'sellonit';

/**
 * - `worker`: long-lived blocking connections. BullMQ requires
 *   `maxRetriesPerRequest: null` so workers keep waiting through Redis restarts.
 * - `producer`: request-path connections (API). Fail fast instead of queueing
 *   commands indefinitely, so an HTTP request never hangs because Redis is down.
 */
export type RedisConnectionRole = 'worker' | 'producer';

export interface RedisConnectionOptions {
  url: string;
  role: RedisConnectionRole;
  /** Shown in `CLIENT LIST`, useful when debugging connections. */
  connectionName: string;
  /** Connect immediately (default) or on first command. */
  lazyConnect?: boolean;
}

export function createRedisConnection(options: RedisConnectionOptions): Redis {
  const common = {
    connectionName: options.connectionName,
    lazyConnect: options.lazyConnect ?? false,
    // Exponential-ish backoff capped at 5s between reconnect attempts.
    retryStrategy: (attempt: number) => Math.min(attempt * 200, 5_000),
  };

  if (options.role === 'worker') {
    return new Redis(options.url, { ...common, maxRetriesPerRequest: null });
  }

  return new Redis(options.url, {
    ...common,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    connectTimeout: 5_000,
  });
}
