import { UnrecoverableError, type Job } from 'bullmq';
import type { JobContracts } from '@sellonit/queue';
import type { Logger } from '../logger.js';

type QueueKey = keyof JobContracts;

export interface JobContext {
  logger: Logger;
}

/** Handlers for every job name of one queue, typed from `@sellonit/queue` contracts. */
export type QueueHandlers<Q extends QueueKey> = {
  [N in keyof JobContracts[Q]]: JobContracts[Q][N] extends { data: infer D; result: infer R }
    ? (data: D, context: JobContext & { job: Job }) => Promise<R>
    : never;
};

export interface QueueProcessorDefinition {
  queue: QueueKey;
  /** Per-queue concurrency override; defaults to WORKER_CONCURRENCY. */
  concurrency?: number;
  process: (job: Job, context: JobContext) => Promise<unknown>;
}

/**
 * Bind a queue to its job handlers. Unknown job names fail with
 * `UnrecoverableError` so they are not retried pointlessly.
 */
export function defineQueueProcessor<Q extends QueueKey>(
  queue: Q,
  handlers: QueueHandlers<Q>,
  options: { concurrency?: number } = {},
): QueueProcessorDefinition {
  const byName = handlers as Record<
    string,
    (data: unknown, context: JobContext & { job: Job }) => Promise<unknown>
  >;
  return {
    queue,
    ...(options.concurrency ? { concurrency: options.concurrency } : {}),
    process: (job, context) => {
      const handler = byName[job.name];
      if (!handler) {
        throw new UnrecoverableError(`No handler for job "${job.name}" on queue "${queue}"`);
      }
      return handler(job.data, { ...context, job });
    },
  };
}
