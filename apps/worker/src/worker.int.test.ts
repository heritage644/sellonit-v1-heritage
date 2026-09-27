/**
 * End-to-end queue path against a real Redis:
 *   producer (same @sellonit/queue factory the API uses) → Redis/BullMQ → worker host.
 */
import { QueueEvents } from 'bullmq';
import { pino } from 'pino';
import { afterAll, describe, expect, it } from 'vitest';
import { createQueue, createRedisConnection } from '@sellonit/queue';
import { processors } from './jobs/index.js';
import { startWorkers } from './worker-host.js';

const redisUrl = process.env.REDIS_URL;
if (!redisUrl) throw new Error('REDIS_URL is required for integration tests');

const prefix = `sellonit-test-${process.pid}`;
const workerConnection = createRedisConnection({
  url: redisUrl,
  role: 'worker',
  connectionName: 'worker-int-test',
});
const producerConnection = createRedisConnection({
  url: redisUrl,
  role: 'worker',
  connectionName: 'producer-int-test',
});
const host = startWorkers({
  processors,
  connection: workerConnection,
  prefix,
  concurrency: 1,
  logger: pino({ level: 'silent' }),
});
const queue = createQueue('system', producerConnection, prefix);
const events = new QueueEvents('system', { connection: producerConnection.duplicate(), prefix });

afterAll(async () => {
  await host.close();
  await events.close();
  await queue.obliterate({ force: true });
  await queue.close();
  await Promise.all([workerConnection.quit(), producerConnection.quit()]);
});

describe('worker (real Redis)', () => {
  it('consumes and completes a job enqueued by a producer', async () => {
    await Promise.all([
      ...host.workers.map((worker) => worker.waitUntilReady()),
      events.waitUntilReady(),
    ]);
    const requestedAt = new Date().toISOString();
    const job = await queue.add('system.ping', { requestedAt, requestedBy: 'integration-test' });
    const result = await job.waitUntilFinished(events, 10_000);
    expect(result).toMatchObject({ pong: true, requestedAt });
  });
});
