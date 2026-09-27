/**
 * Job payload/result contracts, keyed by queue then job name.
 *
 * Payloads are serialised to Redis as JSON: keep them small, JSON-safe
 * (ISO strings, not Date), and reference entities by ID rather than embedding
 * them. Never put secrets or payment/customer PII in a job payload.
 */
export interface SystemPingPayload {
  /** ISO-8601 timestamp set by the producer. */
  requestedAt: string;
  /** Free-form identifier of the producer (e.g. `api`, `smoke-test`). */
  requestedBy: string;
}

export interface SystemPingResult {
  pong: true;
  requestedAt: string;
  processedAt: string;
}

export interface JobContracts {
  system: {
    'system.ping': { data: SystemPingPayload; result: SystemPingResult };
  };
}
