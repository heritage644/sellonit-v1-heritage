import type { SystemPingPayload, SystemPingResult } from '@sellonit/queue';

/**
 * Infrastructure smoke job: proves a job produced by the API (or a test) is
 * consumed and completed by the worker. Carries no business logic.
 */
export function handleSystemPing(
  data: SystemPingPayload,
  now: () => Date = () => new Date(),
): Promise<SystemPingResult> {
  return Promise.resolve({
    pong: true,
    requestedAt: data.requestedAt,
    processedAt: now().toISOString(),
  });
}
