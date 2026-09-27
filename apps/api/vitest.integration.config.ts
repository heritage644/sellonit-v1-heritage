import { existsSync } from 'node:fs';
import { defineConfig } from 'vitest/config';

// Integration tests need real PostgreSQL and Redis (DATABASE_URL, REDIS_URL).
// Locally: `npm run infra:up` and a root .env; in CI: workflow service containers.
const rootEnvFile = new URL('../../.env', import.meta.url);
if (existsSync(rootEnvFile)) process.loadEnvFile(rootEnvFile);

export default defineConfig({
  test: {
    include: ['src/**/*.int.test.ts', 'test/**/*.int.test.ts'],
    environment: 'node',
    testTimeout: 20_000,
    hookTimeout: 20_000,
    fileParallelism: false,
  },
});
