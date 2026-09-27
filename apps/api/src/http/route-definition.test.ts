/**
 * Contract engineering rule (Authorization): "A valid JWT alone is never
 * sufficient to access arbitrary business resources." These tests pin down
 * that implemented authenticated routes must declare authorization, and that
 * the router runs it after authentication.
 */
import express, { type RequestHandler } from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { AppError } from './app-error.js';
import { errorHandler } from './middleware/error-handler.js';
import { authenticate, createJwtAccessTokenVerifier } from './middleware/authenticate.js';
import { requestId } from './middleware/request-id.js';
import { defineModule, route } from './route-definition.js';
import { buildApiRouter } from './router.js';
import { signAccessToken, TEST_JWT_SECRET } from '../../test/helpers.js';

const ok: RequestHandler = (_req, res) => {
  res.json({ ok: true });
};
const passThrough: RequestHandler = (_req, _res, next) => {
  next();
};

describe('route() authorization requirement', () => {
  it('is enforced by the type system', () => {
    // Each call is invalid at compile time; the runtime check backs it up.
    expect(() =>
      // @ts-expect-error — authenticated routes must declare `authorization`
      route('get', '/stores/{storeId}', { access: 'authenticated', handlers: [ok] }),
    ).toThrow(/must declare authorization/);
    expect(() =>
      route('get', '/stores/{storeId}', {
        access: 'authenticated',
        // @ts-expect-error — an empty check list is not an authorization
        authorization: [],
        handlers: [ok],
      }),
    ).toThrow(/must declare authorization/);
  });

  it('rejects unknown exemption values at start-up (e.g. via casts)', () => {
    const options = {
      access: 'authenticated',
      authorization: 'trust-me',
      handlers: [ok],
    } as unknown as Parameters<typeof route>[2];
    expect(() => route('get', '/x', options)).toThrow(/must declare authorization/);
  });

  it('accepts membership/ownership middleware and the explicit exemptions', () => {
    expect(
      route('get', '/a', { access: 'authenticated', authorization: [passThrough], handlers: [ok] })
        .authorization,
    ).toHaveLength(1);
    expect(
      route('get', '/me', { access: 'authenticated', authorization: 'caller-only', handlers: [ok] })
        .authorization,
    ).toHaveLength(0);
    expect(
      route('get', '/health', { access: 'public', handlers: [ok] }).authorization,
    ).toHaveLength(0);
  });
});

describe('router authorization order', () => {
  const denyUnlessOwner: RequestHandler = (req, _res, next) => {
    next(req.get('X-Test-Owner') === 'yes' ? undefined : AppError.forbidden());
  };

  const app = express();
  app.use(requestId());
  app.use(
    '/v1',
    buildApiRouter(
      [
        defineModule('test', [
          route('post', '/things/{thingId}', {
            access: 'authenticated',
            authorization: [denyUnlessOwner],
            idempotencyKey: true,
            handlers: [ok],
          }),
        ]),
      ],
      {
        authenticate: authenticate(
          createJwtAccessTokenVerifier({
            secret: TEST_JWT_SECRET,
            issuer: 'sellonit-api',
            audience: 'sellonit',
          }),
        ),
        rateLimiters: { default: passThrough, auth: passThrough },
      },
    ),
  );
  app.use(errorHandler());

  it('authenticates before authorizing (401 without a token)', async () => {
    const response = await request(app).post('/v1/things/1');
    expect(response.status).toBe(401);
  });

  it('a valid JWT alone is not enough (403)', async () => {
    const token = await signAccessToken();
    const response = await request(app)
      .post('/v1/things/1')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', 'test-idempotency-key-0001');
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  it('authorizes before checking request details such as Idempotency-Key', async () => {
    const token = await signAccessToken();
    const response = await request(app)
      .post('/v1/things/1')
      .set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(403);
  });

  it('reaches the handler once authorization passes', async () => {
    const token = await signAccessToken();
    const response = await request(app)
      .post('/v1/things/1')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Test-Owner', 'yes')
      .set('Idempotency-Key', 'test-idempotency-key-0001');
    expect(response.status).toBe(200);
  });
});
