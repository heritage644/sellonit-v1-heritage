#!/usr/bin/env node
/**
 * Verifies that packages/shared/src/api.d.ts is exactly what
 * `npm run generate:api` produces from docs/openapi.yaml.
 *
 * Read-only: generates into a temporary directory and compares. It never
 * rewrites the committed file, so it is safe to run in CI.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const committedPath = join(root, 'packages/shared/src/api.d.ts');
const tempDir = mkdtempSync(join(tmpdir(), 'sellonit-api-types-'));
const generatedPath = join(tempDir, 'api.d.ts');

try {
  execFileSync(
    process.execPath,
    [
      join(root, 'node_modules/openapi-typescript/bin/cli.js'),
      join(root, 'docs/openapi.yaml'),
      '-o',
      generatedPath,
    ],
    { cwd: root, stdio: ['ignore', 'ignore', 'inherit'] },
  );

  let committed = null;
  try {
    committed = readFileSync(committedPath, 'utf8');
  } catch {
    console.error(
      '✗ packages/shared/src/api.d.ts is missing. Run `npm run generate:api` and commit the result.',
    );
  }
  const generated = readFileSync(generatedPath, 'utf8');

  // process.exitCode (not process.exit) so the `finally` cleanup always runs.
  if (committed === null) {
    process.exitCode = 1;
  } else if (committed !== generated) {
    const a = committed.split('\n');
    const b = generated.split('\n');
    const firstDiff = a.findIndex((line, index) => line !== b[index]);
    const line = firstDiff === -1 ? Math.min(a.length, b.length) + 1 : firstDiff + 1;
    console.error(
      [
        '✗ Generated API types are out of date with docs/openapi.yaml.',
        `  First difference at packages/shared/src/api.d.ts:${line}`,
        `    committed: ${JSON.stringify(a[line - 1] ?? '<end of file>')}`,
        `    expected:  ${JSON.stringify(b[line - 1] ?? '<end of file>')}`,
        '  Fix: run `npm run generate:api` and commit packages/shared/src/api.d.ts.',
      ].join('\n'),
    );
    process.exitCode = 1;
  } else {
    console.warn('✓ packages/shared/src/api.d.ts matches docs/openapi.yaml');
  }
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}
