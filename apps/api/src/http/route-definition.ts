import type { RequestHandler } from 'express';
import { ERROR_CODES } from '@sellonit/shared';
import { AppError } from './app-error.js';

export type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';

/**
 * `public` = the contract declares `security: []` for the operation.
 * `authenticated` = the global `bearerAuth` requirement applies.
 */
export type RouteAccess = 'public' | 'authenticated';

/**
 * How an implemented authenticated operation is authorized. Required by
 * `route()` because a valid JWT alone is never sufficient to access business
 * resources (docs/Contract_Engineering_Rules.md → Authorization):
 *
 * - one or more middleware that check business membership / resource
 *   ownership, e.g. `[requireBusinessRole(lookup, { ... })]`;
 * - `'caller-only'`: the operation only reads/writes the authenticated user's
 *   own data (e.g. `GET /me`);
 * - `'no-resource-access'`: the operation touches no resource at all (e.g. the
 *   contract's `405` on `POST /orders/{orderId}`).
 *
 * The two string forms are explicit, reviewable exemptions.
 */
export type RouteAuthorization =
  readonly [RequestHandler, ...RequestHandler[]] | 'caller-only' | 'no-resource-access';

export type RateLimitTier = 'default' | 'auth' | 'none';

export interface RouteDefinition {
  method: HttpMethod;
  /** OpenAPI path relative to the `/v1` base path, e.g. `/stores/{storeId}`. */
  path: string;
  access: RouteAccess;
  /** Authorization middleware, run right after authentication (empty for public or exempt routes). */
  authorization: readonly RequestHandler[];
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

type ImplementedRouteOptions = (
  | (RouteOptions & { access: 'public'; authorization?: never })
  | (RouteOptions & { access: 'authenticated'; authorization: RouteAuthorization })
) & { handlers: readonly RequestHandler[] };

/**
 * An implemented contract operation. Authenticated operations must declare
 * their authorization (enforced by the type and, for casts, at start-up).
 */
export function route(
  method: HttpMethod,
  path: string,
  options: ImplementedRouteOptions,
): RouteDefinition {
  let authorization: readonly RequestHandler[] = [];
  if (options.access === 'authenticated') {
    const declared: unknown = options.authorization;
    if (declared === 'caller-only' || declared === 'no-resource-access') {
      authorization = [];
    } else if (Array.isArray(declared) && declared.length > 0) {
      authorization = declared as readonly RequestHandler[];
    } else {
      throw new Error(
        `${method.toUpperCase()} ${path}: authenticated routes must declare authorization ` +
          `(membership/ownership middleware, 'caller-only' or 'no-resource-access')`,
      );
    }
  }
  return {
    method,
    path,
    access: options.access,
    authorization,
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
    authorization: [],
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
