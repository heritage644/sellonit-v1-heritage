import { defineConfig } from 'vitest/config';

// Unit tests: no network, no database, no Redis. Integration tests (*.int.test.ts)
// run separately via vitest.integration.config.ts.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
    exclude: ['**/*.int.test.ts', '**/node_modules/**'],
    environment: 'node',
  },
});
