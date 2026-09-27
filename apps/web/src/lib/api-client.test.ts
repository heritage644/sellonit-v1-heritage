import { describe, expect, it } from 'vitest';
import { isApiErrorResponse } from '@sellonit/shared';
import { createApiClient } from './api-client';

function recordingFetch(response: Response) {
  const requests: Request[] = [];
  const fetch: typeof globalThis.fetch = (input, init) => {
    requests.push(new Request(input, init));
    return Promise.resolve(response.clone());
  };
  return { fetch, requests };
}

describe('createApiClient', () => {
  it('calls contract paths under the configured base URL', async () => {
    const { fetch, requests } = recordingFetch(
      Response.json({ status: 'ok', service: 'sellonit-api', timestamp: '2026-01-01T00:00:00Z' }),
    );
    const client = createApiClient({ baseUrl: 'http://api.test/v1', fetch });
    const { data } = await client.GET('/health');
    expect(requests[0]?.url).toBe('http://api.test/v1/health');
    expect(data?.service).toBe('sellonit-api');
  });

  it('substitutes path parameters and attaches the bearer token', async () => {
    const { fetch, requests } = recordingFetch(Response.json({ data: {} }));
    const client = createApiClient({
      baseUrl: 'http://api.test/v1',
      fetch,
      getAccessToken: () => 'token-123',
    });
    await client.GET('/stores/{storeId}', { params: { path: { storeId: 'abc' } } });
    expect(requests[0]?.url).toBe('http://api.test/v1/stores/abc');
    expect(requests[0]?.headers.get('Authorization')).toBe('Bearer token-123');
  });

  it('surfaces the contract ErrorResponse on failure', async () => {
    const body = { error: { code: 'NOT_IMPLEMENTED', message: 'not yet', requestId: 'req-1' } };
    const { fetch } = recordingFetch(Response.json(body, { status: 501 }));
    const client = createApiClient({ baseUrl: 'http://api.test/v1', fetch });
    const { error, response } = await client.GET('/me');
    expect(response.status).toBe(501);
    expect(isApiErrorResponse(error)).toBe(true);
  });
});
