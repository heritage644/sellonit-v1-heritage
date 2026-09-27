import { z } from 'zod';
import {
  commaSeparatedList,
  logLevelSchema,
  nodeEnvSchema,
  optionalSecret,
  parseEnv,
  portSchema,
  positiveIntFromString,
  postgresUrlSchema,
  redisUrlSchema,
  requireInProduction,
  type LogLevel,
  type NodeEnv,
} from '@sellonit/config';

const DEV_DEFAULT_CORS_ORIGINS = ['http://localhost:3000'];

const apiEnvSchema = z
  .object({
    NODE_ENV: nodeEnvSchema,
    LOG_LEVEL: logLevelSchema,

    API_HOST: z.string().default('0.0.0.0'),
    API_PORT: portSchema.default(4000),
    /** Number of reverse-proxy hops to trust for client IPs (0 = none). */
    API_TRUST_PROXY: z.coerce.number().int().min(0).default(0),
    API_BODY_LIMIT: z.string().default('1mb'),
    API_SHUTDOWN_TIMEOUT_MS: positiveIntFromString.default(10_000),

    DATABASE_URL: postgresUrlSchema,
    REDIS_URL: redisUrlSchema,
    QUEUE_PREFIX: z
      .string()
      .regex(/^[a-z0-9:_-]+$/, 'must contain only a-z, 0-9, ":", "_" or "-"')
      .default('sellonit'),

    CORS_ORIGINS: commaSeparatedList.pipe(z.array(z.url())).optional(),

    JWT_ACCESS_SECRET: optionalSecret(32),
    JWT_ISSUER: z.string().min(1).default('sellonit-api'),
    JWT_AUDIENCE: z.string().min(1).default('sellonit'),

    PAYMENT_WEBHOOK_SECRET: optionalSecret(16),
    THREE_PL_WEBHOOK_SECRET: optionalSecret(16),

    RATE_LIMIT_WINDOW_MS: positiveIntFromString.default(60_000),
    RATE_LIMIT_MAX: positiveIntFromString.default(300),
    AUTH_RATE_LIMIT_MAX: positiveIntFromString.default(20),
  })
  .superRefine(
    requireInProduction([
      'JWT_ACCESS_SECRET',
      'PAYMENT_WEBHOOK_SECRET',
      'THREE_PL_WEBHOOK_SECRET',
      'CORS_ORIGINS',
    ]),
  );

export interface ApiConfig {
  env: NodeEnv;
  isProduction: boolean;
  serviceName: 'sellonit-api';
  log: { level: LogLevel };
  server: {
    host: string;
    port: number;
    trustProxy: number;
    bodyLimit: string;
    shutdownTimeoutMs: number;
  };
  database: { url: string };
  redis: { url: string; queuePrefix: string };
  cors: { origins: readonly string[] };
  auth: {
    /** Undefined in development when unset: authenticated routes then fail closed (401). */
    accessTokenSecret: string | undefined;
    issuer: string;
    audience: string;
  };
  webhooks: {
    /** Undefined when unset: the webhook endpoint fails closed (503). */
    paymentSecret: string | undefined;
    threePlSecret: string | undefined;
  };
  rateLimit: { windowMs: number; max: number; authMax: number };
}

/**
 * Load and validate API configuration. Throws `EnvValidationError` (listing
 * variable names only, never values) when the environment is invalid.
 */
export function loadConfig(source: Record<string, string | undefined> = process.env): ApiConfig {
  const env = parseEnv('@sellonit/api', apiEnvSchema, source);
  const isProduction = env.NODE_ENV === 'production';

  return {
    env: env.NODE_ENV,
    isProduction,
    serviceName: 'sellonit-api',
    log: { level: env.LOG_LEVEL },
    server: {
      host: env.API_HOST,
      port: env.API_PORT,
      trustProxy: env.API_TRUST_PROXY,
      bodyLimit: env.API_BODY_LIMIT,
      shutdownTimeoutMs: env.API_SHUTDOWN_TIMEOUT_MS,
    },
    database: { url: env.DATABASE_URL },
    redis: { url: env.REDIS_URL, queuePrefix: env.QUEUE_PREFIX },
    cors: { origins: env.CORS_ORIGINS ?? (isProduction ? [] : DEV_DEFAULT_CORS_ORIGINS) },
    auth: {
      accessTokenSecret: env.JWT_ACCESS_SECRET,
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE,
    },
    webhooks: {
      paymentSecret: env.PAYMENT_WEBHOOK_SECRET,
      threePlSecret: env.THREE_PL_WEBHOOK_SECRET,
    },
    rateLimit: {
      windowMs: env.RATE_LIMIT_WINDOW_MS,
      max: env.RATE_LIMIT_MAX,
      authMax: env.AUTH_RATE_LIMIT_MAX,
    },
  };
}
