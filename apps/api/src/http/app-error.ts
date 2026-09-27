import { ERROR_CODES, type ApiErrorDetail, type ErrorCode } from '@sellonit/shared';

/**
 * The only error type modules should throw for expected failures. The central
 * error handler turns it into the contract `ErrorResponse`; anything else is
 * treated as an unexpected 500 whose details are never sent to the client.
 */
export class AppError extends Error {
  readonly status: number;
  readonly code: ErrorCode;
  readonly details: readonly ApiErrorDetail[] | undefined;
  readonly headers: Readonly<Record<string, string>>;

  constructor(
    status: number,
    code: ErrorCode,
    message: string,
    options: {
      details?: readonly ApiErrorDetail[];
      headers?: Record<string, string>;
      cause?: unknown;
    } = {},
  ) {
    super(message, { cause: options.cause });
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = options.details;
    this.headers = options.headers ?? {};
  }

  static validation(
    details: readonly ApiErrorDetail[],
    message = 'Request validation failed',
  ): AppError {
    return new AppError(400, ERROR_CODES.VALIDATION_ERROR, message, { details });
  }

  static unauthorized(message = 'Authentication required'): AppError {
    return new AppError(401, ERROR_CODES.UNAUTHORIZED, message, {
      headers: { 'WWW-Authenticate': 'Bearer' },
    });
  }

  static forbidden(message = 'You do not have access to this resource'): AppError {
    return new AppError(403, ERROR_CODES.FORBIDDEN, message);
  }

  static notFound(message = 'Resource not found'): AppError {
    return new AppError(404, ERROR_CODES.NOT_FOUND, message);
  }

  static conflict(message: string, details?: readonly ApiErrorDetail[]): AppError {
    return new AppError(409, ERROR_CODES.CONFLICT, message, details ? { details } : {});
  }

  static serviceUnavailable(message: string, details?: readonly ApiErrorDetail[]): AppError {
    return new AppError(503, ERROR_CODES.SERVICE_UNAVAILABLE, message, details ? { details } : {});
  }
}
