// `tsc` does not copy hand-authored/generated `.d.ts` files into the output
// directory, so the generated OpenAPI types are copied next to the compiled
// re-exports that reference them.
import { copyFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const src = fileURLToPath(new URL('../src/api.d.ts', import.meta.url));
const dest = fileURLToPath(new URL('../dist/api.d.ts', import.meta.url));

copyFileSync(src, dest);
