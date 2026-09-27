import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { errorHandler } from './error-handler.js';
import { requestId } from './request-id.js';
import { getInput, validate } from './validate.js';
import { requireBusinessRole, type MembershipLookup, noMemberships } from './authorize.js';

const BUSINESS_ID = '2d9f4f0e-3c1b-4a39-9c1f-8f5b6a0e7d21';
const USER_ID = '6f1c1f2e-6a8e-4f7a-9d6e-0f6b2b1c9a11';

describe('validate', () => {
  const schemas = {
    params: z.object({ storeId: z.uuid() }),
    query: z.object({ page: z.coerce.number().int().min(1).default(1) }),
    body: z.object({ name: z.string().min(2) }),
  };

  const app = express();
  app.use(requestId());
  app.use(express.json());
  app.post('/stores/:storeId', validate(schemas), (_req, res) => {
    res.json(getInput(res, schemas));
  });
  app.use(errorHandler());

  it('passes parsed and coerced input to the handler', async () => {
    const response = await request(app)
      .post(`/stores/${BUSINESS_ID}?page=3`)
      .send({ name: 'Ada Stores' });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      params: { storeId: BUSINESS_ID },
      query: { page: 3 },
      body: { name: 'Ada Stores' },
    });
  });

  it('returns every issue as an ErrorDetail with a prefixed field', async () => {
    const response = await request(app).post('/stores/not-a-uuid?page=0').send({ name: 'A' });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.details.map((detail: { field: string }) => detail.field)).toEqual([
      'params.storeId',
      'query.page',
      'body.name',
    ]);
  });
});

describe('requireBusinessRole', () => {
  function appWith(lookup: MembershipLookup, authenticated = true) {
    const app = express();
    app.use(requestId());
    app.use((req, _res, next) => {
      if (authenticated) req.auth = { userId: USER_ID, tokenId: undefined };
      next();
    });
    app.get(
      '/businesses/:businessId',
      requireBusinessRole(lookup, {
        businessId: (req) =>
          typeof req.params.businessId === 'string' ? req.params.businessId : undefined,
        roles: ['OWNER', 'ADMIN'],
      }),
      (req, res) => {
        res.json({ role: req.membership?.role });
      },
    );
    app.use(errorHandler());
    return app;
  }

  const lookupWithRole = (role: 'OWNER' | 'STAFF'): MembershipLookup => ({
    findActiveMembership: (userId, businessId) => Promise.resolve({ userId, businessId, role }),
  });

  it('allows members with a permitted role', async () => {
    const response = await request(appWith(lookupWithRole('OWNER'))).get(
      `/businesses/${BUSINESS_ID}`,
    );
    expect(response.body).toEqual({ role: 'OWNER' });
  });

  it('forbids members without a permitted role', async () => {
    const response = await request(appWith(lookupWithRole('STAFF'))).get(
      `/businesses/${BUSINESS_ID}`,
    );
    expect(response.status).toBe(403);
  });

  it('fails closed with the default lookup (no memberships persisted yet)', async () => {
    const response = await request(appWith(noMemberships)).get(`/businesses/${BUSINESS_ID}`);
    expect(response.status).toBe(403);
  });

  it('requires authentication first', async () => {
    const response = await request(appWith(lookupWithRole('OWNER'), false)).get(
      `/businesses/${BUSINESS_ID}`,
    );
    expect(response.status).toBe(401);
  });
});
