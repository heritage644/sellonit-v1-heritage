import { describe, expect, it } from 'vitest';
import { defaultJobOptions } from './queues.js';
import { createRedisConnection } from './connection.js';

// lazyConnect: these tests never open a socket.
describe('createRedisConnection', () => {
  it('worker connections never give up on blocking commands (BullMQ requirement)', () => {
    const redis = createRedisConnection({
      url: 'redis://localhost:6379',
      role: 'worker',
      connectionName: 't',
      lazyConnect: true,
    });
    expect(redis.options.maxRetriesPerRequest).toBeNull();
    redis.disconnect();
  });

  it('producer connections fail fast so HTTP requests do not hang when Redis is down', () => {
    const redis = createRedisConnection({
      url: 'redis://localhost:6379',
      role: 'producer',
      connectionName: 't',
      lazyConnect: true,
    });
    expect(redis.options).toMatchObject({
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      connectTimeout: 5000,
    });
    expect(redis.options.retryStrategy?.(100)).toBe(5000);
    redis.disconnect();
  });
});

describe('defaultJobOptions', () => {
  it('retries with exponential backoff and bounds retention', () => {
    expect(defaultJobOptions).toMatchObject({
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: { age: 86_400, count: 1000 },
      removeOnFail: { age: 604_800 },
    });
  });
});
