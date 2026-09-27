import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ERROR_CODES, type ApiErrorResponse } from '@sellonit/shared';
import { AppError } from '../app-error.js';

/** Errors raised by body-parser carry a `type` and an HTTP `status`. */
interface BodyParserError {
  type: string;
  status: number;
}

function isBodyParserError(error: unknown): error is BodyParserError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'type' in error &&
    typeof error.type === 'string' &&
    'status' in error &&
    typeof error.status === 'number'
  );
}

function normalize(error: unknown): AppError {
  if (error instanceof AppError) return error;

  // Note: a raw ZodError here is NOT a client error — request validation
  // (`validate`) already converts its failures to AppError. Any other ZodError
  // means internal data failed a schema, so it falls through to 500.

  if (isBodyParserError(error)) {
    if (error.type === 'entity.parse.failed') {
      return new AppError(400, ERROR_CODES.INVALID_JSON, 'Request body is not valid JSON');
    }
    if (error.type === 'entity.too.large') {
      return new AppError(413, ERROR_CODES.PAYLOAD_TOO_LARGE, 'Request body is too large');
    }
    if (error.status >= 400 && error.status < 500) {
      return new AppError(
        error.status,
        ERROR_CODES.VALIDATION_ERROR,
        'Request body could not be read',
      );
    }
  }

  return new AppError(500, ERROR_CODES.INTERNAL_ERROR, 'An unexpected error occurred');
}

/**
 * Central error handler — the only place that writes error responses.
 * Always emits the contract `ErrorResponse`. Messages and stack traces of
 * unexpected errors are never sent to clients.
 *
 * Logging: unexpected errors are attached to `res.err`, which the HTTP logger
 * (pino-http) records — with the stack — on the single per-request log line.
 * Expected errors (AppError, body-parser errors) are logged by status only.
 */
export function errorHandler(): ErrorRequestHandler {
  return (error: unknown, req, res, next) => {
    if (res.headersSent) {
      next(error);
      return;
    }

    const appError = normalize(error);

    if (appError.code === ERROR_CODES.INTERNAL_ERROR) {
      res.err =
        error instanceof Error ? error : new Error(`Non-Error value thrown: ${String(error)}`);
    }

    const body: ApiErrorResponse = {
      error: {
        code: appError.code,
        message: appError.message,
        requestId: req.requestId,
        ...(appError.details ? { details: [...appError.details] } : {}),
      },
    };

    res.set(appError.headers).status(appError.status).json(body);
  };
}

/** Fallback for any path/method that no module registered. */
export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(AppError.notFound(`No route for ${req.method} ${req.path}`));
};
