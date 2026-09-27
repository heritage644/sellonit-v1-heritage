import { SignJWT } from 'jose';
import { pino } from 'pino';
import { createApp, type AppDependencies } from '../src/app.js';
import { loadConfig, type ApiConfig } from '../src/config/env.js';
import type { ReadinessResult, ReadinessService } from '../src/modules/health/health.service.js';

export const TEST_JWT_SECRET = 'test-access-token-secret-that-is-long-enough';
export const TEST_PAYMENT_WEBHOOK_SECRET = 'test-payment-webhook-secret';
export const TEST_3PL_WEBHOOK_SECRET = 'test-3pl-webhook-secret-value';

export const silentLogger = pino({ level: 'silent' });

export function testConfig(env: Record<string, string> = {}): ApiConfig {
  return loadConfig({
    NODE_ENV: 'test',
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
    REDIS_URL: 'redis://localhost:6379',
    JWT_ACCESS_SECRET: TEST_JWT_SECRET,
    PAYMENT_WEBHOOK_SECRET: TEST_PAYMENT_WEBHOOK_SECRET,
    THREE_PL_WEBHOOK_SECRET: TEST_3PL_WEBHOOK_SECRET,
    CORS_ORIGINS: 'http://localhost:3000',
    ...env,
  });
}

export function fixedReadiness(result: ReadinessResult): ReadinessService {
  return { evaluate: () => Promise.resolve(result) };
}

export const READY: ReadinessResult = {
  ready: true,
  checks: [
    { name: 'database', status: 'up' },
    { name: 'redis', status: 'up' },
  ],
};

export function buildTestApp(
  overrides: Partial<AppDependencies> & { env?: Record<string, string> } = {},
) {
  const { env, ...deps } = overrides;
  return createApp({
    config: testConfig(env),
    logger: silentLogger,
    readiness: fixedReadiness(READY),
    ...deps,
  });
}

export async function signAccessToken(
  claims: {
    sub?: string;
    expiresIn?: string;
    issuer?: string;
    audience?: string;
    secret?: string;
  } = {},
): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(claims.sub ?? '6f1c1f2e-6a8e-4f7a-9d6e-0f6b2b1c9a11')
    .setIssuer(claims.issuer ?? 'sellonit-api')
    .setAudience(claims.audience ?? 'sellonit')
    .setIssuedAt()
    .setExpirationTime(claims.expiresIn ?? '5m')
    .sign(new TextEncoder().encode(claims.secret ?? TEST_JWT_SECRET));
}

export const SAMPLE_UUID = '3b241101-e2bb-4255-8caf-4136c566a962';
export const IDEMPOTENCY_KEY = 'test-idempotency-key-0001';
