import { Worker } from 'bullmq';
import type { Redis } from 'ioredis';
import type { QueueProcessorDefinition } from './jobs/define.js';
import type { Logger } from './logger.js';

export interface WorkerHost {
  workers: readonly Worker[];
  /** Stop taking new jobs and wait for active ones to finish. */
  close(): Promise<void>;
}

/**
 * Start one BullMQ Worker per queue processor. BullMQ duplicates the given
 * connection for its blocking commands, which is why it must be created with
 * the `worker` role (`maxRetriesPerRequest: null`).
 *
 * Job payloads are never logged (they may reference customer data); only
 * queue, job name, id and attempt counts are.
 */
export function startWorkers(options: {
  processors: readonly QueueProcessorDefinition[];
  connection: Redis;
  prefix: string;
  concurrency: number;
  logger: Logger;
}): WorkerHost {
  const workers = options.processors.map((definition) => {
    const logger = options.logger.child({ queue: definition.queue });
    const worker = new Worker(definition.queue, (job) => definition.process(job, { logger }), {
      connection: options.connection,
      prefix: options.prefix,
      concurrency: definition.concurrency ?? options.concurrency,
    });

    worker.on('completed', (job) => {
      logger.debug({ jobId: job.id, job: job.name }, 'Job completed');
    });
    worker.on('failed', (job, error) => {
      logger.warn(
        {
          jobId: job?.id,
          job: job?.name,
          attemptsMade: job?.attemptsMade,
          err: { message: error.message },
        },
        'Job failed',
      );
    });
    worker.on('error', (error) => {
      logger.error({ err: error }, 'Worker error');
    });

    return worker;
  });

  return {
    workers,
    async close() {
      await Promise.all(workers.map((worker) => worker.close()));
    },
  };
}
