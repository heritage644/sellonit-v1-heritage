import type { RequestHandler } from 'express';
import { rateLimit } from 'express-rate-limit';
import { ERROR_CODES } from '@sellonit/shared';
import { AppError } from '../app-error.js';

/**
 * Per-IP rate limiting. Uses the in-memory store, which is correct for a
 * single API instance only. Before running more than one instance, switch to
 * a shared Redis store (e.g. `rate-limit-redis`) using the API's Redis connection.
 * Client IPs are only trustworthy when API_TRUST_PROXY matches the deployment.
 */
export function createRateLimiter(options: { windowMs: number; limit: number }): RequestHandler {
  return rateLimit({
    windowMs: options.windowMs,
    limit: options.limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_req, _res, next, opts) => {
      next(
        new AppError(
          opts.statusCode,
          ERROR_CODES.RATE_LIMITED,
          'Too many requests, please retry later',
          {
            headers: { 'Retry-After': String(Math.ceil(options.windowMs / 1000)) },
          },
        ),
      );
    },
  });
}
