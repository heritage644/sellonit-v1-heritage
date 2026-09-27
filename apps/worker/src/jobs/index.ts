import { defineQueueProcessor, type QueueProcessorDefinition } from './define.js';
import { handleSystemPing } from './system/ping.js';

/**
 * Every queue this worker consumes. Add a processor here when a domain module
 * introduces a queue in `@sellonit/queue` (e.g. demand-aggregation, payments,
 * shipments, notifications) — keep job logic in `jobs/<queue>/`.
 */
export const processors: readonly QueueProcessorDefinition[] = [
  defineQueueProcessor('system', {
    'system.ping': (data) => handleSystemPing(data),
  }),
];
