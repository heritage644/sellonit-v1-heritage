import { pino, type Logger } from 'pino';
import type { LogLevel } from '@sellonit/config';

export type { Logger };

export function createLogger(options: { level: LogLevel; service: string }): Logger {
  return pino({
    level: options.level,
    base: { service: options.service },
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: { level: (label) => ({ level: label }) },
    redact: {
      paths: ['*.password', '*.token', '*.secret', '*.authorization'],
      censor: '[REDACTED]',
    },
  });
}
