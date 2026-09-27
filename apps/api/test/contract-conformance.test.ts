/**
 * Guards the API ↔ contract boundary:
 *  1. every operation in docs/openapi.yaml is registered, and nothing else is;
 *  2. `security: []` operations are public; all others require a bearer token;
 *  3. operations declaring the Idempotency-Key parameter enforce it;
 *  4. every operation is actually mounted and answers through the standard
 *     pipeline (no 404s), with unimplemented ones answering 501.
 */
import { readFileSync } from 'node:fs';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { createHmac } from 'node:crypto';
import { createModules } from '../src/modules/index.js';
import type { HttpMethod, RouteDefinition } from '../src/http/route-definition.js';
import {
  buildTestApp,
  fixedReadiness,
  IDEMPOTENCY_KEY,
  READY,
  SAMPLE_UUID,
  signAccessToken,
  TEST_3PL_WEBHOOK_SECRET,
  TEST_PAYMENT_WEBHOOK_SECRET,
} from './helpers.js';

interface ContractOperation {
  method: HttpMethod;
  path: string;
  access: 'public' | 'authenticated';
  idempotencyKey: boolean;
}

interface OpenApiDoc {
  security?: unknown[];
  paths: Record<string, Record<string, unknown>>;
}

interface OpenApiOperation {
  security?: unknown[];
  parameters?: { $ref?: string }[];
}

const METHODS: readonly HttpMethod[] = ['get', 'post', 'put', 'patch', 'delete'];

function loadContractOperations(): ContractOperation[] {
  const doc = parse(
    readFileSync(new URL('../../../docs/openapi.yaml', import.meta.url), 'utf8'),
  ) as OpenApiDoc;
  const operations: ContractOperation[] = [];
  for (const [path, item] of Object.entries(doc.paths)) {
    for (const method of METHODS) {
      const operation = item[method] as OpenApiOperation | undefined;
      if (!operation) continue;
      const security = operation.security ?? doc.security ?? [];
      operations.push({
        method,
        path,
        access: security.length === 0 ? 'public' : 'authenticated',
        idempotencyKey: (operation.parameters ?? []).some(
          (parameter) => parameter.$ref === '#/components/parameters/IdempotencyKey',
        ),
      });
    }
  }
  return operations;
}

const contract = loadContractOperations();
const routes: RouteDefinition[] = createModules({
  serviceName: 'sellonit-api',
  readiness: fixedReadiness(READY),
  webhookSecrets: { payments: 'x'.repeat(16), threePl: 'x'.repeat(16) },
}).flatMap((module) => module.routes);

const key = (operation: { method: string; path: string }) =>
  `${operation.method.toUpperCase()} ${operation.path}`;

describe('API contract conformance', () => {
  it('registers exactly the operations defined in docs/openapi.yaml', () => {
    expect(routes.map(key).sort()).toEqual(contract.map(key).sort());
  });

  it('matches the contract security requirement and Idempotency-Key usage of every operation', () => {
    const byKey = new Map(routes.map((definition) => [key(definition), definition]));
    for (const operation of contract) {
      const definition = byKey.get(key(operation));
      expect({
        op: key(operation),
        access: definition?.access,
        idem: definition?.idempotencyKey,
      }).toEqual({
        op: key(operation),
        access: operation.access,
        idem: operation.idempotencyKey,
      });
    }
  });

  it('mounts every operation behind the standard pipeline', async () => {
    const app = buildTestApp();
    const token = await signAccessToken();
    const expectedImplementedStatus: Record<string, number> = {
      'GET /health': 200,
      'GET /health/ready': 200,
      'POST /orders/{orderId}': 405,
    };

    for (const operation of contract) {
      const url = `/v1${operation.path.replace(/\{storeSlug\}/g, 'demo-store').replace(/\{[A-Za-z]+\}/g, SAMPLE_UUID)}`;
      const body = JSON.stringify({ event: 'test' });
      let req = request(app)[operation.method](url).set('Content-Type', 'application/json');
      if (operation.access === 'authenticated') req = req.set('Authorization', `Bearer ${token}`);
      if (operation.idempotencyKey) req = req.set('Idempotency-Key', IDEMPOTENCY_KEY);
      if (operation.path === '/webhooks/payments') {
        req = req.set(
          'X-Payment-Signature',
          createHmac('sha512', TEST_PAYMENT_WEBHOOK_SECRET).update(body).digest('hex'),
        );
      }
      if (operation.path === '/webhooks/3pl') {
        req = req.set(
          'X-Webhook-Signature',
          createHmac('sha256', TEST_3PL_WEBHOOK_SECRET).update(body).digest('hex'),
        );
      }
      const response = operation.method === 'get' ? await req : await req.send(body);

      const expected = expectedImplementedStatus[key(operation)] ?? 501;
      expect({ op: key(operation), status: response.status }).toEqual({
        op: key(operation),
        status: expected,
      });
      if (expected === 501) {
        expect(response.body.error.code).toBe('NOT_IMPLEMENTED');
      }
    }
  });
});
