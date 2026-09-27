import { Router, type RequestHandler } from 'express';
import { requireIdempotencyKey } from './middleware/idempotency-key.js';
import type { ApiModule, RateLimitTier } from './route-definition.js';

export interface RouterDependencies {
  authenticate: RequestHandler;
  rateLimiters: Record<Exclude<RateLimitTier, 'none'>, RequestHandler>;
}

/** `/stores/{storeId}/listings` → `/stores/:storeId/listings` */
export function toExpressPath(openApiPath: string): string {
  return openApiPath.replace(/\{([A-Za-z0-9_]+)\}/g, ':$1');
}

/**
 * Mounts every module route with the same cross-cutting chain, in order:
 *   rate limit → authentication + authorization (non-public routes) → Idempotency-Key → handlers.
 * Contract-level requirements are therefore applied uniformly and cannot be
 * forgotten by an individual module.
 */
export function buildApiRouter(modules: readonly ApiModule[], deps: RouterDependencies): Router {
  const router = Router();
  const registered = new Set<string>();

  for (const module of modules) {
    for (const definition of module.routes) {
      const key = `${definition.method.toUpperCase()} ${definition.path}`;
      if (registered.has(key)) {
        throw new Error(`Route ${key} is registered twice (module "${module.name}")`);
      }
      registered.add(key);

      const chain: RequestHandler[] = [
        (_req, res, next) => {
          res.locals.routeTemplate = definition.path;
          next();
        },
      ];
      if (definition.rateLimit !== 'none') chain.push(deps.rateLimiters[definition.rateLimit]);
      if (definition.access === 'authenticated')
        chain.push(deps.authenticate, ...definition.authorization);
      if (definition.idempotencyKey) chain.push(requireIdempotencyKey());
      chain.push(...definition.handlers);

      router[definition.method](toExpressPath(definition.path), ...chain);
    }
  }

  return router;
}
