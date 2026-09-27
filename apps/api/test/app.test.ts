import { createHmac } from 'node:crypto';
import { pino } from 'pino';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import {
  buildTestApp,
  fixedReadiness,
  IDEMPOTENCY_KEY,
  SAMPLE_UUID,
  signAccessToken,
  TEST_PAYMENT_WEBHOOK_SECRET,
} from './helpers.js';

const UUID_PATTERN = /^[0-9a-f-]{36}$/;

describe('health', () => {
  it('GET /v1/health returns the contract HealthResponse', async () => {
    const response = await request(buildTestApp()).get('/v1/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: 'ok',
      service: 'sellonit-api',
      timestamp: expect.any(String),
    });
    expect(response.headers['cache-control']).toBe('no-store');
  });

  it('GET /v1/health/ready returns 200 when dependencies are up', async () => {
    const response = await request(buildTestApp()).get('/v1/health/ready');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ready');
  });

  it('GET /v1/health/ready returns 503 ErrorResponse naming the failed dependency', async () => {
    const app = buildTestApp({
      readiness: fixedReadiness({
        ready: false,
        checks: [
          { name: 'database', status: 'up' },
          { name: 'redis', status: 'down', reason: 'timeout' },
        ],
      }),
    });
    const response = await request(app).get('/v1/health/ready');
    expect(response.status).toBe(503);
    expect(response.body.error).toMatchObject({
      code: 'SERVICE_UNAVAILABLE',
      requestId: expect.stringMatching(UUID_PATTERN),
      details: [{ field: 'redis', code: 'timeout', message: 'redis is not ready' }],
    });
  });
});

describe('error handling', () => {
  it('unknown routes return 404 ErrorResponse whose requestId matches X-Request-Id', async () => {
    const response = await request(buildTestApp()).get('/v1/does-not-exist');
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
    expect(response.body.error.requestId).toBe(response.headers['x-request-id']);
  });

  it('honours a safe incoming X-Request-Id', async () => {
    const response = await request(buildTestApp())
      .get('/v1/nope')
      .set('X-Request-Id', 'gateway-req-12345');
    expect(response.headers['x-request-id']).toBe('gateway-req-12345');
    expect(response.body.error.requestId).toBe('gateway-req-12345');
  });

  it('replaces unsafe incoming request IDs', async () => {
    const response = await request(buildTestApp())
      .get('/v1/nope')
      .set('X-Request-Id', 'bad id\twith spaces');
    expect(response.headers['x-request-id']).toMatch(UUID_PATTERN);
  });

  it('malformed JSON returns 400 INVALID_JSON', async () => {
    const response = await request(buildTestApp())
      .post('/v1/carts')
      .set('Content-Type', 'application/json')
      .send('{"storeId": ');
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_JSON');
  });

  it('unexpected errors return a generic 500 without internal details', async () => {
    const app = buildTestApp({
      readiness: {
        evaluate: () => Promise.reject(new Error('connection string postgres://secret@db leaked')),
      },
    });
    const response = await request(app).get('/v1/health/ready');
    expect(response.status).toBe(500);
    expect(response.body.error).toEqual({
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      requestId: expect.any(String),
    });
    expect(JSON.stringify(response.body)).not.toContain('secret');
  });
});

describe('authentication', () => {
  const url = `/v1/stores/${SAMPLE_UUID}`;

  it('rejects missing bearer tokens with 401 and WWW-Authenticate', async () => {
    const response = await request(buildTestApp()).get(url);
    expect(response.status).toBe(401);
    expect(response.headers['www-authenticate']).toBe('Bearer');
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects tokens signed with another secret, issuer or audience', async () => {
    const app = buildTestApp();
    for (const token of [
      await signAccessToken({ secret: 'another-secret-that-is-also-long-enough!!' }),
      await signAccessToken({ issuer: 'someone-else' }),
      await signAccessToken({ audience: 'another-app' }),
      await signAccessToken({ sub: 'not-a-uuid' }),
    ]) {
      const response = await request(app).get(url).set('Authorization', `Bearer ${token}`);
      expect(response.status).toBe(401);
    }
  });

  it('rejects expired tokens', async () => {
    const token = await signAccessToken({ expiresIn: '-1m' });
    const response = await request(buildTestApp()).get(url).set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(401);
    expect(response.body.error.message).toBe('Access token has expired');
  });

  it('fails closed when no JWT secret is configured', async () => {
    const app = buildTestApp({ env: { JWT_ACCESS_SECRET: '' } });
    const token = await signAccessToken();
    const response = await request(app).get(url).set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(401);
  });

  it('lets a valid token through to the (not yet implemented) handler', async () => {
    const token = await signAccessToken();
    const response = await request(buildTestApp()).get(url).set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(501);
    expect(response.body.error).toMatchObject({
      code: 'NOT_IMPLEMENTED',
      message: 'GET /v1/stores/{storeId} is defined in the API contract but not implemented yet',
    });
  });
});

describe('contract-level request requirements', () => {
  it('requires a 16-128 character Idempotency-Key where the contract declares it', async () => {
    const app = buildTestApp();
    const missing = await request(app).post('/v1/carts').send({ storeId: SAMPLE_UUID });
    expect(missing.status).toBe(400);
    expect(missing.body.error.details).toEqual([
      expect.objectContaining({ field: 'Idempotency-Key', code: 'required' }),
    ]);

    const tooShort = await request(app).post('/v1/carts').set('Idempotency-Key', 'short').send({});
    expect(tooShort.body.error.details[0].code).toBe('invalid_length');

    const ok = await request(app)
      .post('/v1/carts')
      .set('Idempotency-Key', IDEMPOTENCY_KEY)
      .send({});
    expect(ok.status).toBe(501);
  });

  it('POST /v1/orders/{orderId} answers 405 as the contract specifies', async () => {
    const token = await signAccessToken();
    const response = await request(buildTestApp())
      .post(`/v1/orders/${SAMPLE_UUID}`)
      .set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(405);
    expect(response.headers.allow).toBe('GET');
    expect(response.body.error.code).toBe('METHOD_NOT_ALLOWED');
  });
});

describe('webhooks', () => {
  const body = JSON.stringify({ event: 'charge.success', reference: 'ref_1', status: 'success' });
  const sign = (payload: string, secret = TEST_PAYMENT_WEBHOOK_SECRET) =>
    createHmac('sha512', secret).update(payload).digest('hex');

  it('rejects unsigned and wrongly signed payment webhooks', async () => {
    const app = buildTestApp();
    const unsigned = await request(app)
      .post('/v1/webhooks/payments')
      .set('Content-Type', 'application/json')
      .send(body);
    expect(unsigned.status).toBe(401);
    expect(unsigned.body.error.code).toBe('INVALID_SIGNATURE');

    const wrong = await request(app)
      .post('/v1/webhooks/payments')
      .set('Content-Type', 'application/json')
      .set('X-Payment-Signature', sign(body, 'some-other-secret'))
      .send(body);
    expect(wrong.status).toBe(401);
  });

  it('verifies the signature over the exact raw bytes', async () => {
    const app = buildTestApp();
    const reformatted = JSON.stringify(JSON.parse(body), null, 2); // same JSON, different bytes
    const response = await request(app)
      .post('/v1/webhooks/payments')
      .set('Content-Type', 'application/json')
      .set('X-Payment-Signature', sign(body))
      .send(reformatted);
    expect(response.status).toBe(401);
  });

  it('accepts a correctly signed webhook, then reports it is not implemented', async () => {
    const response = await request(buildTestApp())
      .post('/v1/webhooks/payments')
      .set('Content-Type', 'application/json')
      .set('X-Payment-Signature', sign(body))
      .send(body);
    expect(response.status).toBe(501);
  });

  it('fails closed with 503 when the webhook secret is not configured', async () => {
    const app = buildTestApp({ env: { PAYMENT_WEBHOOK_SECRET: '' } });
    const response = await request(app)
      .post('/v1/webhooks/payments')
      .set('Content-Type', 'application/json')
      .set('X-Payment-Signature', sign(body))
      .send(body);
    expect(response.status).toBe(503);
  });
});

describe('HTTP security', () => {
  it('sets secure headers and hides the framework', async () => {
    const response = await request(buildTestApp()).get('/v1/health');
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-powered-by']).toBeUndefined();
  });

  it('allows configured CORS origins only', async () => {
    const app = buildTestApp();
    const allowed = await request(app).get('/v1/health').set('Origin', 'http://localhost:3000');
    expect(allowed.headers['access-control-allow-origin']).toBe('http://localhost:3000');

    const denied = await request(app).get('/v1/health').set('Origin', 'https://evil.example');
    expect(denied.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('rate limits credential endpoints with 429 RATE_LIMITED', async () => {
    const app = buildTestApp({ env: { AUTH_RATE_LIMIT_MAX: '2' } });
    await request(app).post('/v1/auth/login').send({});
    await request(app).post('/v1/auth/login').send({});
    const limited = await request(app).post('/v1/auth/login').send({});
    expect(limited.status).toBe(429);
    expect(limited.body.error.code).toBe('RATE_LIMITED');
    expect(limited.headers['retry-after']).toBeDefined();
  });
});

describe('structured request logging', () => {
  function captureLogs() {
    const lines: Record<string, unknown>[] = [];
    const logger = pino(
      { level: 'debug' },
      { write: (chunk: string) => lines.push(JSON.parse(chunk) as Record<string, unknown>) },
    );
    return { logger, lines };
  }

  it('writes one line per request with requestId, method, path, route, status and duration — and no credentials', async () => {
    const { logger, lines } = captureLogs();
    const token = await signAccessToken();
    const response = await request(buildTestApp({ logger }))
      .get(`/v1/stores/${SAMPLE_UUID}?secret=query-value`)
      .set('Authorization', `Bearer ${token}`);

    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({
      level: 40, // warn: intentional 501, not an error
      reqId: response.headers['x-request-id'],
      req: { method: 'GET', path: `/v1/stores/${SAMPLE_UUID}` },
      route: '/stores/{storeId}',
      res: { statusCode: 501 },
      durationMs: expect.any(Number),
    });
    expect(lines[0]).not.toHaveProperty('err');
    const serialized = JSON.stringify(lines);
    expect(serialized).not.toContain(token);
    expect(serialized).not.toContain('query-value');
  });

  it('logs unexpected errors once, at error level, with the real stack', async () => {
    const { logger, lines } = captureLogs();
    const app = buildTestApp({
      logger,
      readiness: { evaluate: () => Promise.reject(new Error('boom-internal')) },
    });
    await request(app).get('/v1/health/ready');

    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({
      level: 50,
      route: '/health/ready',
      err: { message: 'boom-internal' },
    });
    expect((lines[0]?.err as { stack: string }).stack).toContain('boom-internal');
  });

  it('logs successful health probes at debug level', async () => {
    const { logger, lines } = captureLogs();
    await request(buildTestApp({ logger })).get('/v1/health');
    expect(lines[0]).toMatchObject({ level: 20, route: '/health' });
  });
});
