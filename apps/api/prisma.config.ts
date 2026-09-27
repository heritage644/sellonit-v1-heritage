import { existsSync } from 'node:fs';
import { defineConfig } from 'prisma/config';

// The Prisma CLI does not load .env files on its own. For local development,
// load the repository-root .env if present. Variables already set in the real
// environment (CI, containers, production) take precedence.
const rootEnvFile = new URL('../../.env', import.meta.url);
if (existsSync(rootEnvFile)) {
  process.loadEnvFile(rootEnvFile);
}

const databaseUrl = process.env.DATABASE_URL;

export default defineConfig({
  // Multi-file schema: one `<module>.prisma` file per domain module lives in
  // prisma/schema/. `schema.prisma` holds only the generator and datasource.
  schema: 'prisma/schema',
  migrations: {
    path: 'prisma/migrations',
  },
  // `prisma generate` does not need a database URL (CI builds without one).
  // Commands that talk to the database (`migrate`, `studio`, ...) fail with a
  // clear Prisma error if DATABASE_URL is missing.
  ...(databaseUrl ? { datasource: { url: databaseUrl } } : {}),
});
