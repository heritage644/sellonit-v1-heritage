import { pino, type Logger } from 'pino';
import type { LogLevel } from '@sellonit/config';

export type { Logger };

/**
 * Paths that must never reach log output. Request/response bodies are not
 * logged at all; these cover headers and any object a developer logs by hand.
 */
export const REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["x-payment-signature"]',
  'req.headers["x-webhook-signature"]',
  'res.headers["set-cookie"]',
  '*.password',
  '*.newPassword',
  '*.token',
  '*.accessToken',
  '*.refreshToken',
  '*.secret',
  '*.authorization',
  '*.cardNumber',
  '*.cvv',
];

export function createLogger(options: { level: LogLevel; service: string }): Logger {
  return pino({
    level: options.level,
    base: { service: options.service },
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level: (label) => ({ level: label }),
    },
    redact: { paths: REDACT_PATHS, censor: '[REDACTED]' },
  });
}
