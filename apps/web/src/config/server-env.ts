/**
 * Server-side configuration for Server Components and route handlers.
 * Do not import this module from Client Components ('use client').
 */
export function getServerEnv() {
  const apiInternalUrl = (process.env.API_INTERNAL_URL ?? 'http://localhost:4000').replace(
    /\/+$/,
    '',
  );
  try {
    new URL(apiInternalUrl);
  } catch {
    throw new Error(`API_INTERNAL_URL must be an absolute URL, received "${apiInternalUrl}"`);
  }
  return {
    /** Absolute API base including the contract's `/v1` prefix. */
    apiBaseUrl: `${apiInternalUrl}/v1`,
    /** The /status diagnostics page is on by default outside production. */
    statusPageEnabled:
      process.env.WEB_ENABLE_STATUS_PAGE !== undefined
        ? process.env.WEB_ENABLE_STATUS_PAGE === 'true'
        : process.env.NODE_ENV !== 'production',
  };
}
