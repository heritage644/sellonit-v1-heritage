// @ts-check
import js from '@eslint/js';
import nextPlugin from '@next/eslint-plugin-next';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      'apps/web/.next/**',
      'apps/web/next-env.d.ts',
      'apps/api/src/generated/**',
      // Generated from docs/openapi.yaml; drift is checked by `npm run check:api-types`.
      'packages/shared/src/api.d.ts',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.node },
      parserOptions: {
        projectService: {
          allowDefaultProject: [
            'eslint.config.mjs',
            'scripts/*.mjs',
            'packages/shared/scripts/*.mjs',
          ],
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    linterOptions: { reportUnusedDisableDirectives: 'error' },
    rules: {
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      eqeqeq: ['error', 'always'],
      'no-console': ['error', { allow: ['warn', 'error'] }],
    },
  },

  // Plain JavaScript files (config, scripts) are not type-checked.
  {
    files: ['**/*.mjs', '**/*.js'],
    ...tseslint.configs.disableTypeChecked,
  },

  // Tests: Vitest assertions on untyped JSON bodies are expected.
  {
    files: ['**/*.test.ts', '**/*.int.test.ts', 'apps/api/test/**/*.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
    },
  },

  // Frontend: Next.js + React hooks rules, browser globals.
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    plugins: { '@next/next': nextPlugin, 'react-hooks': reactHooks },
    languageOptions: { globals: { ...globals.browser } },
    settings: { next: { rootDir: 'apps/web/' } },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
      ...reactHooks.configs.recommended.rules,
    },
  },

  // Architectural boundaries: browser-facing code must never pull in backend code.
  {
    files: ['apps/web/**/*.{ts,tsx}', 'packages/shared/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@sellonit/queue',
              message: 'Server-only package (Redis/BullMQ). Not allowed in web/shared.',
            },
            {
              name: '@sellonit/config',
              message: 'Server-side env validation. Not allowed in web/shared.',
            },
            { name: 'bullmq', message: 'Server-only. Not allowed in web/shared.' },
            { name: 'ioredis', message: 'Server-only. Not allowed in web/shared.' },
            { name: 'pg', message: 'Server-only. Not allowed in web/shared.' },
          ],
          patterns: [
            {
              group: ['@prisma/*', 'prisma', '**/generated/prisma/**'],
              message: 'Database code is backend-only.',
            },
            {
              group: ['@sellonit/api', '@sellonit/api/*', '@sellonit/worker', '@sellonit/worker/*'],
              message: 'Apps must not import other apps.',
            },
          ],
        },
      ],
    },
  },
);
