import type { Job } from 'bullmq';
import { pino } from 'pino';
import { describe, expect, it } from 'vitest';
import { EnvValidationError } from '@sellonit/config';
import { loadWorkerConfig } from './config.js';
import { processors } from './jobs/index.js';
import { handleSystemPing } from './jobs/system/ping.js';

const logger = pino({ level: 'silent' });

describe('worker configuration', () => {
  it('requires REDIS_URL', () => {
    expect(() => loadWorkerConfig({})).toThrow(EnvValidationError);
  });

  it('applies defaults', () => {
    expect(loadWorkerConfig({ REDIS_URL: 'redis://localhost:6379' })).toMatchObject({
      concurrency: 5,
      redis: { queuePrefix: 'sellonit' },
    });
  });
});

describe('system.ping', () => {
  it('returns pong with timestamps', async () => {
    const now = new Date('2026-01-01T00:00:00.000Z');
    await expect(
      handleSystemPing({ requestedAt: 'r', requestedBy: 'test' }, () => now),
    ).resolves.toEqual({
      pong: true,
      requestedAt: 'r',
      processedAt: now.toISOString(),
    });
  });
});

describe('queue processors', () => {
  const system = processors.find((processor) => processor.queue === 'system');

  it('dispatches jobs by name', async () => {
    const job = { name: 'system.ping', data: { requestedAt: 'r', requestedBy: 'test' } } as Job;
    await expect(system?.process(job, { logger })).resolves.toMatchObject({ pong: true });
  });

  it('rejects unknown job names as unrecoverable', () => {
    const job = { name: 'system.unknown', data: {} } as Job;
    expect(() => system?.process(job, { logger })).toThrow(/No handler for job "system.unknown"/);
  });
});
