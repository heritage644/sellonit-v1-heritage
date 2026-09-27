import type { Request, RequestHandler, Response } from 'express';
import { pinoHttp } from 'pino-http';
import type { Logger } from '../../infrastructure/logger.js';

const QUIET_ROUTES = new Set(['/health', '/health/ready']);

/**
 * Exactly one structured log line per request:
 *   time, level, reqId, req.method, req.path (query string stripped),
 *   route (contract path template, e.g. `/stores/{storeId}`), res.statusCode, durationMs.
 *
 * - Headers and bodies are never logged (tokens, signatures, PII).
 * - Unexpected errors are attached by the error handler to `res.err` and logged
 *   here at `error` level with their stack.
 * - Intentional 5xx responses (501 Not Implemented, 503 not ready) are `warn`,
 *   with no synthetic error object.
 * - Successful health probes are `debug` so orchestrator polling doesn't flood logs.
 *
 * Note: `req.path`/`req.baseUrl` are rewritten by Express inside mounted
 * routers, so paths are read from `originalUrl` and the route template from
 * `res.locals` (set by the router when an operation matches).
 */
export function httpLogger(logger: Logger): RequestHandler {
  const pathOf = (req: Request) => req.originalUrl.split('?')[0] ?? '/';
  const routeOf = (res: Response) => res.locals.routeTemplate;

  return pinoHttp({
    logger,
    genReqId: (req) => (req as Request).requestId,
    quietReqLogger: true,
    customLogLevel: (_req, res, error) => {
      if (error ?? res.err) return 'error';
      if (res.statusCode >= 400) return 'warn';
      const route = routeOf(res as Response);
      if (route && QUIET_ROUTES.has(route)) return 'debug';
      return 'info';
    },
    customSuccessMessage: (req, res) => `${req.method} ${pathOf(req as Request)} ${res.statusCode}`,
    customErrorMessage: (req, res) => `${req.method} ${pathOf(req as Request)} ${res.statusCode}`,
    // pino-http fabricates "failed with status code 5xx" errors; keep only real ones.
    customErrorObject: (_req, res, _error, val: Record<string, unknown>) => {
      if (res.err) return val;
      const { err: _synthetic, ...rest } = val;
      return rest;
    },
    customProps: (_req, res) => ({ route: routeOf(res as Response) }),
    serializers: {
      req: (req: { id: unknown; method: string; url: string }) => ({
        id: req.id,
        method: req.method,
        path: req.url.split('?')[0],
      }),
      res: (res: { statusCode: number }) => ({ statusCode: res.statusCode }),
    },
    customAttributeKeys: { responseTime: 'durationMs' },
  });
}
