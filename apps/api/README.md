# @sellonit/api

Express 5 **modular monolith** that implements [`docs/openapi.yaml`](../../docs/openapi.yaml).
Base path: `/v1`. Default port: `4000`.

> **Status:** infrastructure only. Health endpoints work end to end. Every other
> contract operation is mounted with its real security, rate-limit and
> `Idempotency-Key` behaviour, but answers **`501 NOT_IMPLEMENTED`** in the
> contract `ErrorResponse` shape. Nothing returns fake success data.

## Layout

```
src/
  main.ts                 process entry: config → Prisma/Redis → HTTP server → graceful shutdown
  app.ts                  createApp(): helmet, CORS, JSON body (+ raw body), /v1 router, 404, errors
  config/env.ts           zod-validated environment → typed ApiConfig (fails fast)
  infrastructure/         logger (pino), database (Prisma + pg adapter), redis/queues (BullMQ producer)
  http/
    app-error.ts          AppError → contract ErrorResponse
    route-definition.ts   route() / plannedRoute() / defineModule()
    router.ts             builds the /v1 router from module route definitions
    middleware/           request-id, http-logger, authenticate, authorize, idempotency-key,
                          rate-limit, webhook-signature, validate, error-handler
  modules/<module>/       one folder per domain module (23), see below
  generated/prisma/       Prisma client (generated, git-ignored)
prisma/
  schema/schema.prisma    generator + datasource only (multi-file schema)
  migrations/             committed migrations (none yet)
test/                     contract conformance, HTTP behaviour, integration (real PostgreSQL/Redis)
```

## Request pipeline

```
request-id → http-logger → helmet → CORS → JSON body parser (keeps raw bytes)
  (request-id and logging come first so even rejected requests are correlated and logged)
  → /v1 router: [rate limit] → [authenticate → authorization] → [Idempotency-Key] → [module-specific, e.g. webhook signature] → handler
  → 404 handler → central error handler (always the contract ErrorResponse)
```

Each module declares its operations; the router applies the cross-cutting
middleware from that declaration, so security cannot be forgotten per handler:

```ts
plannedRoute('post', '/carts', { access: 'public', idempotencyKey: true }); // 501 until implemented
route('get', '/health', { access: 'public', rateLimit: 'none' }, handler); // implemented
```

`test/contract-conformance.test.ts` fails if the registered operations,
their public/authenticated access, or their `Idempotency-Key` requirement
drift from `docs/openapi.yaml`.

### Implementing an operation

1. Replace `plannedRoute(...)` with `route(...)` in the module's `*.routes.ts`,
   with `validate(schemas)` and the handler in `handlers`.
2. **Authenticated routes must declare `authorization`** or they don't compile:
   membership/ownership middleware such as `[requireBusinessRole(lookup, …)]`, or
   the explicit exemptions `'caller-only'` / `'no-resource-access'`. A valid JWT
   alone is never sufficient. A real `MembershipLookup` backed by the database
   must replace `noMemberships`.
3. Put business logic in a `*.service.ts` and data access in a `*.repository.ts` inside the module.
4. Add the module's Prisma models in `prisma/schema/<module>.prisma` and run `npm run db:migrate`.
5. Update the expected status in the conformance test.

### Rules every implementation must follow

From [`docs/Contract_Engineering_Rules.md`](../../docs/Contract_Engineering_Rules.md)
and the [contract README](../../docs/README.md):

- **Inventory** changes run inside a database transaction; supplier inventory is the source of truth.
- **Checkout** validates price and stock against the database, never against client-supplied values.
- **Idempotency:** implement `Idempotency-Key` replay storage before any operation that declares it.
- **Payments:** the browser may start a payment but can never mark an order paid.
  Only a verified provider webhook or a server-side verification changes payment state.
  Providers retry webhooks, so deduplicate events by provider reference.
- **Order ≠ Fulfillment ≠ Shipment:** creating an order does not mean stock has reached the 3PL.
- **HTTP:** `204` responses have no body. `PUT` is only for singleton resources (profiles, pricing rules).
- **Versioning:** removing or renaming fields, changing their meaning, or tightening validation is breaking and needs a new API version.

## Domain modules

| Module                       | Contract tag / resources           | Notes                                                                                                       |
| ---------------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `health`                     | Health                             | **Implemented.** Liveness `/health`; readiness `/health/ready` checks PostgreSQL + Redis (2 s timeout each) |
| `auth`                       | Auth                               | Credential endpoints use the stricter `auth` rate-limit tier                                                |
| `users`                      | `/me`                              | Tagged _Auth_ in the contract; lives here as it is the user profile                                         |
| `businesses`                 | Businesses, members                | Business membership roles drive authorization                                                               |
| `suppliers`, `retailers`     | Supplier / retailer profiles       |                                                                                                             |
| `stores`, `storefront`       | Retailer stores, public storefront |                                                                                                             |
| `supplier-products`          | **Master product record**          | Owned by suppliers                                                                                          |
| `inventory`                  | Supplier stock                     |                                                                                                             |
| `catalogue`                  | Supplier catalogue browsing        |                                                                                                             |
| `listings`                   | `RetailerProductListing`           | **References** a SupplierProduct; never copies it                                                           |
| `customers`, `carts`         | Shoppers, carts, checkout          |                                                                                                             |
| `orders`                     | Orders                             | `POST /orders/{id}` answers `405` with `Allow: GET` as the contract requires                                |
| `payments`                   | Payments + payment webhook         | `PaymentProvider` port (`payment-provider.ts`), no adapter yet                                              |
| `fulfillment`                | Fulfillments                       | Separate from Order and Shipment                                                                            |
| `shipments`                  | Shipments                          | Separate from Fulfillment                                                                                   |
| `logistics`                  | 3PL webhook                        | `FulfillmentProvider` port (`fulfillment-provider.ts`) — no logistics company hardcoded                     |
| `demand-aggregation`         | Demand batches                     | Room for aggregating retailer demand per supplier                                                           |
| `bulk-supply`                | `BulkSupplyRequest`                |                                                                                                             |
| `notifications`, `analytics` |                                    |                                                                                                             |

## Cross-cutting behaviour

| Concern          | Implementation                                                                                                                                                                                                                        |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Errors           | `AppError` + central `errorHandler`. Always `{ error: { code, message, requestId, details? } }`. Unexpected errors → generic 500; message/stack never sent                                                                            |
| Validation       | `validate({ params, query, body })` with zod; every issue becomes an `ErrorDetail` (`field` prefixed with `params.`/`query.`/`body.`)                                                                                                 |
| Request ID       | `X-Request-Id` accepted if safe (`^[A-Za-z0-9._:-]{8,128}$`), else a UUID; echoed in header, logs and errors                                                                                                                          |
| Logging          | pino JSON, one line per request: time, level, reqId, method, path (no query), route template, status, durationMs. No headers/bodies. Health probes at `debug`                                                                         |
| Authentication   | `Authorization: Bearer` HS256 JWT via `jose`; `iss`, `aud`, `exp`, UUID `sub` required. Without `JWT_ACCESS_SECRET` every protected route answers 401 (fails closed). Token issuance is not implemented (Auth module is 501)          |
| Authorization    | Implemented authenticated routes must declare `authorization` (type-checked, verified at start-up); it runs right after authentication. `requireBusinessRole(lookup, { businessId, roles })`; the default lookup grants nothing       |
| Rate limiting    | `express-rate-limit`, IETF draft-8 headers, 429 `RATE_LIMITED` + `Retry-After`. Tiers: `default`, `auth`, `none` (webhooks, health). **In-memory store: per instance** — use a Redis store before running multiple replicas           |
| Idempotency      | `Idempotency-Key` (16–128 chars) enforced where the contract declares it. **Replay storage is not implemented** — it must be added (PostgreSQL, same transaction as the write) before those operations are implemented                |
| Webhooks         | HMAC over the exact raw body, constant-time compare. Payments: `X-Payment-Signature`, SHA-512 hex. 3PL: `X-Webhook-Signature`, SHA-256 hex. Missing secret → 503 (fails closed). See [contract review](../../docs/contract-review.md) |
| Security headers | helmet defaults; `x-powered-by` disabled; CORS allow-list from `CORS_ORIGINS`                                                                                                                                                         |
| Shutdown         | SIGTERM/SIGINT → readiness reports `shutting_down` → stop accepting connections → close queues, Redis, Prisma → exit; forced exit after `API_SHUTDOWN_TIMEOUT_MS`                                                                     |

## Database (Prisma 7)

- Schema: `prisma/schema/` (multi-file). **No models yet** — models are added
  per module as operations get implemented; no migration exists yet.
- Client: `prisma-client` generator → `src/generated/prisma` (ESM), used with
  the `@prisma/adapter-pg` driver adapter. `DATABASE_URL` comes only from the environment.
- Conventions: singular PascalCase models mapped to snake_case tables; UUID
  primary keys; money as integer minor units + currency (never floats);
  SupplierProduct is the master record; Order, Fulfillment and Shipment are separate models.

```bash
npm run db:generate   # regenerate the client (also runs before build)
npm run db:migrate    # create/apply a migration in development
npm run db:deploy     # apply committed migrations (CI/CD, docker compose `migrate` service)
```

## Scripts

```bash
npm run dev -w @sellonit/api               # tsx watch, loads the root .env
npm run test -w @sellonit/api              # unit + HTTP + contract conformance (no services needed)
npm run test:integration -w @sellonit/api  # needs PostgreSQL + Redis (DATABASE_URL, REDIS_URL)
npm run build -w @sellonit/api && npm run start -w @sellonit/api
```
