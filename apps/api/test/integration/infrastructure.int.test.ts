/**
 * Proves the API can reach its real dependencies: PostgreSQL through Prisma
 * (driver adapter) and Redis/BullMQ, and that readiness reflects them.
 */
import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { loadConfig } from '../../src/config/env.js';
import { createPrismaClient, pingDatabase } from '../../src/infrastructure/database.js';
import {
  closeApiQueues,
  createApiQueues,
  createApiRedis,
  pingRedis,
} from '../../src/infrastructure/redis.js';
import { createReadinessService } from '../../src/modules/health/health.service.js';
import { silentLogger } from '../helpers.js';

const config = loadConfig({ ...process.env, NODE_ENV: 'test' });
const prisma = createPrismaClient(config.database.url);
const redis = createApiRedis(config.redis.url);
const queuePrefix = `sellonit-test-${process.pid}`;
const queues = createApiQueues(redis, queuePrefix);

afterAll(async () => {
  await queues.system.obliterate({ force: true }).catch(() => undefined);
  await closeApiQueues(queues);
  await redis.quit();
  await prisma.$disconnect();
});

describe('API infrastructure (real PostgreSQL + Redis)', () => {
  it('queries PostgreSQL through Prisma', async () => {
    const rows = await prisma.$queryRaw<{ ok: number }[]>`SELECT 1::int AS ok`;
    expect(rows).toEqual([{ ok: 1 }]);
  });

  it('talks to Redis and can enqueue a BullMQ job', async () => {
    await pingRedis(redis);
    const job = await queues.system.add('system.ping', {
      requestedAt: new Date().toISOString(),
      requestedBy: 'api-integration-test',
    });
    expect(job.id).toBeDefined();
    expect(await queues.system.getJobCounts('waiting')).toMatchObject({ waiting: 1 });
  });

  it('GET /v1/health/ready returns 200 when PostgreSQL and Redis are reachable', async () => {
    const readiness = createReadinessService({
      checks: [
        { name: 'database', check: () => pingDatabase(prisma) },
        { name: 'redis', check: () => pingRedis(redis) },
      ],
      timeoutMs: 2_000,
      isShuttingDown: () => false,
      logger: silentLogger,
    });
    const response = await request(createApp({ config, logger: silentLogger, readiness })).get(
      '/v1/health/ready',
    );
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ready');
  });

  it('GET /v1/health/ready returns 503 when PostgreSQL is unreachable', async () => {
    const unreachable = createPrismaClient('postgresql://nobody:nothing@127.0.0.1:1/none');
    const readiness = createReadinessService({
      checks: [{ name: 'database', check: () => pingDatabase(unreachable) }],
      timeoutMs: 2_000,
      isShuttingDown: () => false,
      logger: silentLogger,
    });
    const response = await request(createApp({ config, logger: silentLogger, readiness })).get(
      '/v1/health/ready',
    );
    expect(response.status).toBe(503);
    expect(response.body.error.details[0]).toMatchObject({ field: 'database' });
    await unreachable.$disconnect();
  });
});
