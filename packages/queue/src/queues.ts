import { Queue, type DefaultJobOptions } from 'bullmq';
import type { Redis } from 'ioredis';
import type { JobContracts } from './contracts.js';
import { DEFAULT_QUEUE_PREFIX } from './connection.js';

/** Conservative defaults: bounded retries and bounded Redis memory usage. */
export const defaultJobOptions: DefaultJobOptions = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 1_000 },
  removeOnComplete: { age: 24 * 60 * 60, count: 1_000 },
  removeOnFail: { age: 7 * 24 * 60 * 60 },
};

type Contract<Q extends keyof JobContracts> = JobContracts[Q];
type NameOf<Q extends keyof JobContracts> = keyof Contract<Q> & string;
type DataOf<Q extends keyof JobContracts> = {
  [N in NameOf<Q>]: Contract<Q>[N] extends { data: infer D } ? D : never;
}[NameOf<Q>];
type ResultOf<Q extends keyof JobContracts> = {
  [N in NameOf<Q>]: Contract<Q>[N] extends { result: infer R } ? R : never;
}[NameOf<Q>];

export type TypedQueue<Q extends keyof JobContracts> = Queue<DataOf<Q>, ResultOf<Q>, NameOf<Q>>;

/**
 * Create a producer-side queue bound to the shared prefix and default job options.
 * The caller owns the connection and must close both queue and connection on shutdown.
 */
export function createQueue<Q extends keyof JobContracts>(
  name: Q,
  connection: Redis,
  prefix: string = DEFAULT_QUEUE_PREFIX,
): TypedQueue<Q> {
  return new Queue<DataOf<Q>, ResultOf<Q>, NameOf<Q>>(name, {
    connection,
    prefix,
    defaultJobOptions,
  });
}
