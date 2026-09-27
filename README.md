# Sellonit

Virtual-inventory commerce and supply-chain platform: suppliers own the
physical product master records, retailers sell them through their own
storefronts, and orders flow through fulfillment and shipment via pluggable
third-party logistics (3PL) providers.

> **Status: repository foundation.** Infrastructure, security middleware,
> health checks, the contract-driven route skeleton, the worker and the web
> shell work end to end. Business operations are mounted but answer
> `501 NOT_IMPLEMENTED` until they are built. See [`apps/api/README.md`](apps/api/README.md).

## Repository layout

```
apps/
  api/        Express 5 REST API — modular monolith, Prisma/PostgreSQL, BullMQ producer
  worker/     BullMQ background worker (separate process)
  web/        Next.js 16 frontend shell (App Router)
packages/
  shared/     Browser-safe: OpenAPI-generated types, contract enums, error codes, money utils
  config/     Server-side env validation helpers (zod)
  queue/      SERVER-ONLY: queue names, job payload contracts, Redis/BullMQ connection factory
docs/
  openapi.yaml          The API contract — source of truth for the HTTP API
  README.md             Contract README: domain rules, MVP aggregation rules, CI contract gate
  Contract_Engineering_Rules.md  Versioning, HTTP semantics, concurrency, authorization, payment rules
  contract-review.md    Open questions/inconsistencies found in the contract
scripts/
  check-api-types.mjs   Fails if generated API types drift from docs/openapi.yaml
docker-compose.yml      PostgreSQL + Redis (default) and containerised apps (profile `apps`)
```

**Boundaries (enforced by ESLint):** `apps/web` and `packages/shared` may not
import Prisma, database code, Redis, BullMQ, `@sellonit/queue`, `@sellonit/config`
or other apps. Only `@sellonit/shared` crosses the frontend/backend boundary.

## Stack

Node.js 22 LTS · TypeScript 5.9 (strict) · npm workspaces · Express 5 · zod 4 ·
PostgreSQL 17 + Prisma 7 (driver adapter `@prisma/adapter-pg`) · Redis 7 +
BullMQ 5 + ioredis · pino · Next.js 16 + React 19 · openapi-typescript +
openapi-fetch · Vitest · ESLint 10 (typescript-eslint) · Prettier · Docker Compose.

## Getting started

Prerequisites: Node.js ≥ 22.12 (`nvm use`), npm ≥ 10, Docker (for PostgreSQL and Redis).

```bash
npm ci
cp .env.example .env            # then set JWT_ACCESS_SECRET etc. — see comments in the file
docker compose up -d            # PostgreSQL + Redis on 127.0.0.1
npm run db:deploy               # apply migrations (none exist yet — foundation only)
npm run dev                     # api :4000, worker, web :3000 (builds shared packages first)
```

Then open:

- http://localhost:3000 — web shell
- http://localhost:3000/status — dev diagnostics: web → API → PostgreSQL/Redis
- http://localhost:4000/v1/health and `/v1/health/ready`

To run everything in containers instead: `docker compose --profile apps up --build`.

## Commands

| Command                                            | What it does                                                                        |
| -------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `npm run dev`                                      | Build shared packages, generate Prisma client, run api + worker + web in watch mode |
| `npm run lint`                                     | ESLint (type-aware), zero warnings allowed                                          |
| `npm run format` / `format:check`                  | Prettier                                                                            |
| `npm run typecheck`                                | `tsc --noEmit` in every workspace (web runs `next typegen` first)                   |
| `npm test`                                         | Unit, HTTP and contract-conformance tests — no services required                    |
| `npm run test:integration`                         | Tests against real PostgreSQL + Redis (`DATABASE_URL`, `REDIS_URL`)                 |
| `npm run build`                                    | Build every workspace (packages, API, worker, Next.js standalone)                   |
| `npm run generate:api`                             | Regenerate `packages/shared/src/api.d.ts` from `docs/openapi.yaml`                  |
| `npm run validate:api`                             | Lint the OpenAPI contract (Redocly)                                                 |
| `npm run check:api-types`                          | Fail if the committed generated types differ from the contract (read-only)          |
| `npm run db:generate` / `db:migrate` / `db:deploy` | Prisma client / dev migration / apply migrations                                    |
| `npm run infra:up` / `infra:down`                  | Start / stop the compose stack                                                      |

`lint`, `typecheck`, `test` and `test:integration` first run `prepare:workspace`
(build shared packages + generate the Prisma client), so they work on a fresh clone.

## API contract workflow

`docs/openapi.yaml` is the source of truth. To change the API:

1. Edit `docs/openapi.yaml` following `docs/Contract_Engineering_Rules.md` (breaking changes need a
   new API version; open questions are in `docs/contract-review.md`).
2. `npm run validate:api && npm run generate:api` and commit the regenerated
   `packages/shared/src/api.d.ts` together with the contract.
3. Update the route registry in the relevant `apps/api/src/modules/*` —
   `apps/api/test/contract-conformance.test.ts` fails until paths, security
   and `Idempotency-Key` usage match the contract.

CI never regenerates or commits files; it only verifies (`check:api-types`).

## Architecture notes

- **API:** modular monolith, one folder per domain module; cross-cutting
  concerns (rate limiting, authentication, idempotency keys, webhook signatures)
  are applied by the router from each route's declaration.
- **Domain rules baked into the structure:** `SupplierProduct` is the master
  record and `RetailerProductListing` references it; Order ≠ Fulfillment ≠
  Shipment; demand aggregation and `BulkSupplyRequest` have their own modules;
  3PLs sit behind a `FulfillmentProvider` interface and payments behind
  `PaymentProvider` — no provider is hardcoded.
- **Worker:** consumes BullMQ queues defined in `@sellonit/queue`; the API
  enqueues with the same typed contracts. Only an infrastructure `system.ping` job exists.
- **Web:** server components call the API with a typed `openapi-fetch` client;
  browser calls go through the same-origin `/api/v1/*` proxy. No global state library.

## Environment

All variables are documented in [`.env.example`](.env.example). Configuration
is validated at start-up; in `NODE_ENV=production` the API refuses to start
without `JWT_ACCESS_SECRET`, `PAYMENT_WEBHOOK_SECRET`, `THREE_PL_WEBHOOK_SECRET`
and `CORS_ORIGINS`. Never commit `.env`.
