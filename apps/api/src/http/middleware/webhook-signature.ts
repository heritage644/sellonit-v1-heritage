import { createHmac, timingSafeEqual } from 'node:crypto';
import type { RequestHandler } from 'express';
import { ERROR_CODES } from '@sellonit/shared';
import { AppError } from '../app-error.js';

export interface WebhookSignatureOptions {
  /** Header carrying the signature, as named in the contract. */
  header: string;
  /** Shared secret. Undefined = not configured → fail closed with 503. */
  secret: string | undefined;
  /** HMAC digest algorithm used by the provider. */
  algorithm: 'sha256' | 'sha512';
}

export function computeSignature(
  rawBody: Buffer,
  secret: string,
  algorithm: 'sha256' | 'sha512',
): string {
  return createHmac(algorithm, secret).update(rawBody).digest('hex');
}

/**
 * Verifies an HMAC signature (hex) over the exact raw request bytes, using a
 * constant-time comparison. Must run before any webhook handler; a webhook is
 * never trusted — or even parsed into domain objects — without it.
 *
 * Raw bytes come from `req.rawBody`, captured by the JSON body parser in app.ts.
 */
export function verifyWebhookSignature(options: WebhookSignatureOptions): RequestHandler {
  return (req, _res, next) => {
    if (!options.secret) {
      next(AppError.serviceUnavailable('Webhook verification is not configured'));
      return;
    }

    const provided = req.get(options.header);
    const rawBody = req.rawBody;
    if (!provided || !rawBody) {
      next(new AppError(401, ERROR_CODES.INVALID_SIGNATURE, 'Missing webhook signature'));
      return;
    }

    const expected = Buffer.from(
      computeSignature(rawBody, options.secret, options.algorithm),
      'utf8',
    );
    const actual = Buffer.from(provided.trim().toLowerCase(), 'utf8');

    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
      next(new AppError(401, ERROR_CODES.INVALID_SIGNATURE, 'Invalid webhook signature'));
      return;
    }
    next();
  };
}
