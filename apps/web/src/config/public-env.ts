/**
 * Browser-safe configuration. Only `NEXT_PUBLIC_*` values may appear here —
 * Next.js inlines them into client bundles at build time, so NEVER put secrets
 * in a `NEXT_PUBLIC_*` variable.
 */
export const publicEnv = {
  /** Base URL the browser uses for API calls. Defaults to the same-origin proxy. */
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api/v1',
  appName: 'Sellonit',
} as const;
