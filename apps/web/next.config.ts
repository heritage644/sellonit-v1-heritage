import { fileURLToPath } from 'node:url';
import type { NextConfig } from 'next';

const repoRoot = fileURLToPath(new URL('../../', import.meta.url));

/**
 * Where the Next.js server reaches the API (server-side fetches and the
 * `/api/v1/*` proxy below). Rewrites are resolved at BUILD time, so this must
 * be set when running `next build` (the Dockerfile takes it as a build arg).
 */
const apiInternalUrl = (process.env.API_INTERNAL_URL ?? 'http://localhost:4000').replace(
  /\/+$/,
  '',
);

/**
 * Dev-server only: extra hostnames (comma-separated, wildcards allowed) that may
 * load dev assets/HMR, e.g. when the dev server is opened through a tunnel or
 * remote preview. Next.js blocks cross-origin dev requests by default.
 * Has no effect on `next build` / `next start`.
 */
const allowedDevOrigins = (process.env.WEB_ALLOWED_DEV_ORIGINS ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  allowedDevOrigins,
  output: 'standalone',
  // Monorepo: trace/bundle workspace packages from the repository root.
  outputFileTracingRoot: repoRoot,
  turbopack: { root: repoRoot },
  poweredByHeader: false,
  reactStrictMode: true,
  typedRoutes: true,
  rewrites() {
    // Browser code calls same-origin `/api/v1/...`; Next proxies to the API.
    // This avoids CORS in local/dev setups and never exposes internal hostnames.
    return Promise.resolve([
      { source: '/api/v1/:path*', destination: `${apiInternalUrl}/v1/:path*` },
    ]);
  },
};

export default nextConfig;
