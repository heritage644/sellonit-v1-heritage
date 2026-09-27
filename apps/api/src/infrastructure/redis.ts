import { createQueue, createRedisConnection, type TypedQueue } from '@sellonit/queue';
import type { Redis } from 'ioredis';

export type { Redis };

/**
 * The API's Redis connection: producer role (fails fast instead of buffering
 * commands while Redis is unavailable, so HTTP requests never hang).
 */
export function createApiRedis(url: string): Redis {
  return createRedisConnection({ url, role: 'producer', connectionName: 'sellonit-api' });
}

/** Readiness probe. */
export async function pingRedis(redis: Redis): Promise<void> {
  const reply = await redis.ping();
  if (reply !== 'PONG') throw new Error('Unexpected PING reply');
}

/**
 * Producer-side queues the API may enqueue into. Modules receive the queue
 * they need through their factory; they never create BullMQ objects directly.
 */
// A type alias (not an interface) so Object.values() infers the queue union instead of any[].
export type ApiQueues = {
  system: TypedQueue<'system'>;
};

export function createApiQueues(redis: Redis, prefix: string): ApiQueues {
  return {
    system: createQueue('system', redis, prefix),
  };
}

export async function closeApiQueues(queues: ApiQueues): Promise<void> {
  await Promise.all(Object.values(queues).map((queue) => queue.close()));
}
