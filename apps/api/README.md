# @sellonit/api

Express REST API for Sellonit. The contract is [`docs/openapi.yaml`](../../docs/openapi.yaml);
follow [`docs/Contract_Engineering_Rules.md`](../../docs/Contract_Engineering_Rules.md) and the
[contract README](../../docs/README.md).

`src/main.ts` starts an empty Express server. Nothing else is implemented.

## Layout

```
prisma/
  schema/schema.prisma   generator + datasource only; add one <module>.prisma per module
  migrations/            created by `npm run db:migrate`
prisma.config.ts         Prisma CLI config (reads DATABASE_URL, loads the root .env)
src/
  main.ts                entry point
  config/                (empty)
  http/middleware/       (empty)
  infrastructure/        (empty)
  modules/<domain>/      (empty) one folder per domain area of the contract
test/integration/        (empty) *.int.test.ts files run with `npm run test:integration`
```

The Prisma client is generated into `src/generated/prisma` (git-ignored) by `npm run db:generate`.

## Scripts

| Script                     | What it does                                 |
| -------------------------- | -------------------------------------------- |
| `npm run dev`              | Watch mode with `tsx`, loads the root `.env` |
| `npm run build` / `start`  | Compile to `dist/` / run `dist/main.js`      |
| `npm test`                 | Unit tests (`src/**/*.test.ts`)              |
| `npm run test:integration` | Integration tests (needs PostgreSQL + Redis) |
| `npm run db:migrate`       | Create and apply a development migration     |
| `npm run db:deploy`        | Apply committed migrations                   |
