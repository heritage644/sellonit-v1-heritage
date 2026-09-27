import { existsSync } from 'node:fs';
import { defineConfig } from 'vitest/config';

// Requires a real Redis (REDIS_URL). Locally: `npm run infra:up` and a root .env.
const rootEnvFile = new URL('../../.env', import.meta.url);
if (existsSync(rootEnvFile)) process.loadEnvFile(rootEnvFile);

export default defineConfig({
  test: {
    include: ['src/**/*.int.test.ts'],
    environment: 'node',
    testTimeout: 20_000,
    hookTimeout: 20_000,
  },
});
