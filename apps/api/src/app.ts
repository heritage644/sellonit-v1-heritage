import cors from 'cors';
import express, { type Express, type Request } from 'express';
import helmet from 'helmet';
import type { ApiConfig } from './config/env.js';
import type { Logger } from './infrastructure/logger.js';
import {
  authenticate,
  createJwtAccessTokenVerifier,
  unconfiguredAccessTokenVerifier,
  type AccessTokenVerifier,
} from './http/middleware/authenticate.js';
import { errorHandler, notFoundHandler } from './http/middleware/error-handler.js';
import { httpLogger } from './http/middleware/http-logger.js';
import { createRateLimiter } from './http/middleware/rate-limit.js';
import { REQUEST_ID_HEADER, requestId } from './http/middleware/request-id.js';
import { buildApiRouter } from './http/router.js';
import type { ReadinessService } from './modules/health/health.service.js';
import { createModules } from './modules/index.js';

export const API_BASE_PATH = '/v1';

export interface AppDependencies {
  config: ApiConfig;
  logger: Logger;
  readiness: ReadinessService;
  /** Override token verification (tests). Defaults to HS256 JWT from config. */
  accessTokenVerifier?: AccessTokenVerifier;
}

function defaultVerifier(config: ApiConfig, logger: Logger): AccessTokenVerifier {
  if (config.auth.accessTokenSecret) {
    return createJwtAccessTokenVerifier({
      secret: config.auth.accessTokenSecret,
      issuer: config.auth.issuer,
      audience: config.auth.audience,
    });
  }
  logger.warn('JWT_ACCESS_SECRET is not set: all authenticated routes will respond 401');
  return unconfiguredAccessTokenVerifier;
}

/**
 * Build the Express application. Pure composition — no network I/O, no
 * `listen()` — so tests can drive it in-process with supertest.
 */
export function createApp(deps: AppDependencies): Express {
  const { config, logger } = deps;
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', config.server.trustProxy);

  app.use(requestId());
  app.use(httpLogger(logger));
  app.use(helmet());
  app.use(
    cors({
      origin: [...config.cors.origins],
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      allowedHeaders: ['Authorization', 'Content-Type', 'Idempotency-Key', REQUEST_ID_HEADER],
      exposedHeaders: [REQUEST_ID_HEADER, 'RateLimit', 'RateLimit-Policy', 'Retry-After'],
      maxAge: 600,
    }),
  );
  app.use(
    express.json({
      limit: config.server.bodyLimit,
      // Keep the exact bytes: webhook signatures are computed over the raw body.
      verify: (req, _res, buffer) => {
        (req as unknown as Request).rawBody = buffer;
      },
    }),
  );

  const router = buildApiRouter(
    createModules({
      serviceName: config.serviceName,
      readiness: deps.readiness,
      webhookSecrets: {
        payments: config.webhooks.paymentSecret,
        threePl: config.webhooks.threePlSecret,
      },
    }),
    {
      authenticate: authenticate(deps.accessTokenVerifier ?? defaultVerifier(config, logger)),
      rateLimiters: {
        default: createRateLimiter({
          windowMs: config.rateLimit.windowMs,
          limit: config.rateLimit.max,
        }),
        auth: createRateLimiter({
          windowMs: config.rateLimit.windowMs,
          limit: config.rateLimit.authMax,
        }),
      },
    },
  );

  app.use(API_BASE_PATH, router);
  app.use(notFoundHandler);
  app.use(errorHandler());

  return app;
}
