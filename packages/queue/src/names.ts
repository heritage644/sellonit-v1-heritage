/**
 * Queue registry. Every queue the platform uses is declared here so producers
 * (API) and consumers (worker) cannot disagree on names.
 *
 * Only the `system` queue exists at bootstrap; it proves the
 * API → Redis/BullMQ → worker path. Planned domain queues (add them here when
 * the owning module is implemented, not before):
 *   - demand-aggregation  (batch window/threshold evaluation, batch release)
 *   - bulk-supply         (supplier bulk request dispatch)
 *   - payments            (verified provider webhook processing)
 *   - shipments           (3PL status sync, IN_HUB_HOLDING expiry)
 *   - notifications       (email/SMS delivery)
 */
export const QUEUE_NAMES = {
  system: 'system',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

export const JOB_NAMES = {
  system: {
    ping: 'system.ping',
  },
} as const;

type ValuesOf<T> = T[keyof T];
export type JobName = ValuesOf<{ [Q in keyof typeof JOB_NAMES]: ValuesOf<(typeof JOB_NAMES)[Q]> }>;
