import { z } from 'zod';
import {
  logLevelSchema,
  nodeEnvSchema,
  parseEnv,
  positiveIntFromString,
  redisUrlSchema,
  type LogLevel,
  type NodeEnv,
} from '@sellonit/config';

const workerEnvSchema = z.object({
  NODE_ENV: nodeEnvSchema,
  LOG_LEVEL: logLevelSchema,
  REDIS_URL: redisUrlSchema,
  QUEUE_PREFIX: z
    .string()
    .regex(/^[a-z0-9:_-]+$/, 'must contain only a-z, 0-9, ":", "_" or "-"')
    .default('sellonit'),
  WORKER_CONCURRENCY: positiveIntFromString.default(5),
  /** Give up at start-up if Redis is not reachable within this time. */
  REDIS_CONNECT_TIMEOUT_MS: positiveIntFromString.default(10_000),
  /** Time allowed for active jobs to finish on SIGTERM before forcing exit. */
  WORKER_SHUTDOWN_TIMEOUT_MS: positiveIntFromString.default(30_000),
});

export interface WorkerConfig {
  env: NodeEnv;
  serviceName: 'sellonit-worker';
  log: { level: LogLevel };
  redis: { url: string; queuePrefix: string; connectTimeoutMs: number };
  concurrency: number;
  shutdownTimeoutMs: number;
}

export function loadWorkerConfig(
  source: Record<string, string | undefined> = process.env,
): WorkerConfig {
  const env = parseEnv('@sellonit/worker', workerEnvSchema, source);
  return {
    env: env.NODE_ENV,
    serviceName: 'sellonit-worker',
    log: { level: env.LOG_LEVEL },
    redis: {
      url: env.REDIS_URL,
      queuePrefix: env.QUEUE_PREFIX,
      connectTimeoutMs: env.REDIS_CONNECT_TIMEOUT_MS,
    },
    concurrency: env.WORKER_CONCURRENCY,
    shutdownTimeoutMs: env.WORKER_SHUTDOWN_TIMEOUT_MS,
  };
}
