import { pino } from 'pino';
import { describe, expect, it } from 'vitest';
import { createReadinessService } from './health.service.js';

const logger = pino({ level: 'silent' });

describe('createReadinessService', () => {
  it('is ready when every check passes', async () => {
    const service = createReadinessService({
      checks: [{ name: 'database', check: () => Promise.resolve() }],
      timeoutMs: 100,
      isShuttingDown: () => false,
      logger,
    });
    expect(await service.evaluate()).toEqual({
      ready: true,
      checks: [{ name: 'database', status: 'up' }],
    });
  });

  it('reports failing and hanging checks separately', async () => {
    const service = createReadinessService({
      checks: [
        { name: 'database', check: () => Promise.reject(new Error('ECONNREFUSED')) },
        { name: 'redis', check: () => new Promise<void>(() => undefined) },
      ],
      timeoutMs: 20,
      isShuttingDown: () => false,
      logger,
    });
    expect(await service.evaluate()).toEqual({
      ready: false,
      checks: [
        { name: 'database', status: 'down', reason: 'error' },
        { name: 'redis', status: 'down', reason: 'timeout' },
      ],
    });
  });

  it('reports not ready while shutting down, without probing dependencies', async () => {
    let probed = false;
    const service = createReadinessService({
      checks: [
        {
          name: 'database',
          check: () => {
            probed = true;
            return Promise.resolve();
          },
        },
      ],
      timeoutMs: 20,
      isShuttingDown: () => true,
      logger,
    });
    expect((await service.evaluate()).ready).toBe(false);
    expect(probed).toBe(false);
  });
});
