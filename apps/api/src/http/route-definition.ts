import type { RequestHandler } from 'express';
import { ERROR_CODES } from '@sellonit/shared';
import { AppError } from './app-error.js';

export type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';

/**
 * `public` = the contract declares `security: []` for the operation.
 * `authenticated` = the global `bearerAuth` requirement applies.
 * Business/store authorization is added per route with `requireBusinessRole`.
 */
export type RouteAccess = 'public' | 'authenticated';

export type RateLimitTier = 'default' | 'auth' | 'none';

export interface RouteDefinition {
  method: HttpMethod;
  /** OpenAPI path relative to the `/v1` base path, e.g. `/stores/{storeId}`. */
  path: string;
  access: RouteAccess;
  /** The contract requires the `Idempotency-Key` header. */
  idempotencyKey: boolean;
  rateLimit: RateLimitTier;
  /** False while the operation answers 501 NOT_IMPLEMENTED. */
  implemented: boolean;
  /** Route-specific middleware/handlers, run after the cross-cutting chain. */
  handlers: readonly RequestHandler[];
}

export interface ApiModule {
  name: string;
  routes: readonly RouteDefinition[];
}

interface RouteOptions {
  access: RouteAccess;
  idempotencyKey?: boolean;
  rateLimit?: RateLimitTier;
}

/** An implemented contract operation. */
export function route(
  method: HttpMethod,
  path: string,
  options: RouteOptions & { handlers: readonly RequestHandler[] },
): RouteDefinition {
  return {
    method,
    path,
    access: options.access,
    idempotencyKey: options.idempotencyKey ?? false,
    rateLimit: options.rateLimit ?? 'default',
    implemented: true,
    handlers: options.handlers,
  };
}

/**
 * A contract operation that is declared but not implemented yet. The
 * cross-cutting contract requirements (auth, Idempotency-Key, rate limit and
 * any `before` middleware such as webhook signature checks) are still
 * enforced; the handler then answers 501 NOT_IMPLEMENTED. It never pretends
 * to succeed.
 */
export function plannedRoute(
  method: HttpMethod,
  path: string,
  options: RouteOptions & { before?: readonly RequestHandler[] },
): RouteDefinition {
  return {
    method,
    path,
    access: options.access,
    idempotencyKey: options.idempotencyKey ?? false,
    rateLimit: options.rateLimit ?? 'default',
    implemented: false,
    handlers: [...(options.before ?? []), notImplemented(method, path)],
  };
}

export function notImplemented(method: HttpMethod, path: string): RequestHandler {
  const message = `${method.toUpperCase()} /v1${path} is defined in the API contract but not implemented yet`;
  return (_req, _res, next) => {
    next(new AppError(501, ERROR_CODES.NOT_IMPLEMENTED, message));
  };
}

export function defineModule(name: string, routes: readonly RouteDefinition[]): ApiModule {
  return { name, routes };
}
