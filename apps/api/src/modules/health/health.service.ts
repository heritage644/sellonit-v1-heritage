import type { Logger } from '../../infrastructure/logger.js';

export interface DependencyCheck {
  /** Stable name reported in readiness failures, e.g. `database`, `redis`. */
  name: string;
  check: () => Promise<void>;
}

export type CheckFailureReason = 'timeout' | 'error' | 'shutting_down';

export interface CheckResult {
  name: string;
  status: 'up' | 'down';
  reason?: CheckFailureReason;
}

export interface ReadinessResult {
  ready: boolean;
  checks: CheckResult[];
}

export interface ReadinessService {
  evaluate(): Promise<ReadinessResult>;
}

class CheckTimeoutError extends Error {}

async function withTimeout(promise: Promise<void>, timeoutMs: number): Promise<void> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      reject(new CheckTimeoutError());
    }, timeoutMs);
  });
  try {
    await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Readiness = "can this instance serve traffic right now?" (PostgreSQL and
 * Redis reachable, not draining). Liveness (`GET /health`) deliberately does
 * not check dependencies, so a database outage never gets healthy API
 * processes killed and restarted.
 */
export function createReadinessService(options: {
  checks: readonly DependencyCheck[];
  timeoutMs: number;
  isShuttingDown: () => boolean;
  logger: Logger;
}): ReadinessService {
  return {
    async evaluate() {
      if (options.isShuttingDown()) {
        return {
          ready: false,
          checks: [{ name: 'process', status: 'down', reason: 'shutting_down' }],
        };
      }

      const checks = await Promise.all(
        options.checks.map(async ({ name, check }): Promise<CheckResult> => {
          try {
            await withTimeout(check(), options.timeoutMs);
            return { name, status: 'up' };
          } catch (error) {
            const reason: CheckFailureReason =
              error instanceof CheckTimeoutError ? 'timeout' : 'error';
            // Full error detail goes to server logs only, never to the response.
            options.logger.warn({ dependency: name, reason, err: error }, 'Readiness check failed');
            return { name, status: 'down', reason };
          }
        }),
      );

      return { ready: checks.every((check) => check.status === 'up'), checks };
    },
  };
}
