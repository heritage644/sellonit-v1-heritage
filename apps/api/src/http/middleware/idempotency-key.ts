import type { RequestHandler } from 'express';
import { AppError } from '../app-error.js';

export const IDEMPOTENCY_KEY_HEADER = 'Idempotency-Key';

/** Contract: `components.parameters.IdempotencyKey` — required, 16–128 characters. */
const MIN_LENGTH = 16;
const MAX_LENGTH = 128;

/**
 * Enforces the contract's `Idempotency-Key` header on the operations that
 * declare it.
 *
 * Replay protection (storing the key with a request fingerprint and returning
 * the original response on retry) is NOT implemented yet; it must be added —
 * backed by PostgreSQL, inside the same transaction as the write — before any
 * of these operations is implemented. See apps/api/README.md.
 */
export function requireIdempotencyKey(): RequestHandler {
  return (req, _res, next) => {
    const key = req.get(IDEMPOTENCY_KEY_HEADER);
    if (key === undefined || key.length < MIN_LENGTH || key.length > MAX_LENGTH) {
      next(
        AppError.validation([
          {
            field: IDEMPOTENCY_KEY_HEADER,
            code: key === undefined ? 'required' : 'invalid_length',
            message: `${IDEMPOTENCY_KEY_HEADER} header is required (${MIN_LENGTH}-${MAX_LENGTH} characters)`,
          },
        ]),
      );
      return;
    }
    next();
  };
}
