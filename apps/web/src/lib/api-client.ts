import createClient, { type Middleware } from 'openapi-fetch';
import type { paths } from '@sellonit/shared';

export interface ApiClientOptions {
  /** e.g. `/api/v1` in the browser or `http://api:4000/v1` on the server. */
  baseUrl: string;
  /** Supplies the bearer token for authenticated operations, if any. */
  getAccessToken?: () => string | undefined | Promise<string | undefined>;
  fetch?: typeof globalThis.fetch;
}

/**
 * Typed client for the Sellonit REST API. Paths, parameters, request bodies
 * and responses are all checked against `docs/openapi.yaml` through the
 * generated `paths` type in `@sellonit/shared`.
 */
export function createApiClient(options: ApiClientOptions) {
  const client = createClient<paths>({
    baseUrl: options.baseUrl,
    ...(options.fetch ? { fetch: options.fetch } : {}),
  });

  const { getAccessToken } = options;
  if (getAccessToken) {
    const auth: Middleware = {
      async onRequest({ request }) {
        const token = await getAccessToken();
        if (token && !request.headers.has('Authorization')) {
          request.headers.set('Authorization', `Bearer ${token}`);
        }
        return request;
      },
    };
    client.use(auth);
  }

  return client;
}

export type ApiClient = ReturnType<typeof createApiClient>;
