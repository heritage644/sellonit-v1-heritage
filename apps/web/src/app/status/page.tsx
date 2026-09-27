import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isApiErrorResponse } from '@sellonit/shared';
import { getServerEnv } from '@/config/server-env';
import { createApiClient } from '@/lib/api-client';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'System status' };

interface ProbeResult {
  label: string;
  ok: boolean;
  httpStatus?: number;
  summary: string;
}

async function probe(
  label: string,
  run: () => Promise<{ response: Response; data?: unknown; error?: unknown }>,
) {
  try {
    const { response, data, error } = await run();
    if (response.ok) {
      return {
        label,
        ok: true,
        httpStatus: response.status,
        summary: JSON.stringify(data),
      } satisfies ProbeResult;
    }
    const summary = isApiErrorResponse(error)
      ? `${error.error.code}: ${error.error.message}${
          error.error.details
            ? ` (${error.error.details.map((d) => `${d.field ?? '?'}=${d.code ?? '?'}`).join(', ')})`
            : ''
        }`
      : `HTTP ${response.status}`;
    return { label, ok: false, httpStatus: response.status, summary } satisfies ProbeResult;
  } catch (cause) {
    return {
      label,
      ok: false,
      summary: `API unreachable (${cause instanceof Error ? cause.message : 'unknown error'})`,
    } satisfies ProbeResult;
  }
}

/** Development diagnostics: is the web server able to reach the API, and is the API ready? */
export default async function StatusPage() {
  const env = getServerEnv();
  if (!env.statusPageEnabled) notFound();

  const api = createApiClient({ baseUrl: env.apiBaseUrl });
  const opts = { signal: AbortSignal.timeout(3000), cache: 'no-store' as const };
  const results = await Promise.all([
    probe('API liveness (GET /v1/health)', () => api.GET('/health', opts)),
    probe('API readiness — PostgreSQL + Redis (GET /v1/health/ready)', () =>
      api.GET('/health/ready', opts),
    ),
  ]);

  return (
    <section>
      <h1>System status</h1>
      <p className="muted">
        Checked server-side at {new Date().toISOString()} against {env.apiBaseUrl}
      </p>
      <ul className="status-list">
        {results.map((result) => (
          <li key={result.label} className={result.ok ? 'ok' : 'down'}>
            <strong>{result.ok ? 'UP' : 'DOWN'}</strong> {result.label}
            {result.httpStatus ? <span className="muted"> — HTTP {result.httpStatus}</span> : null}
            <pre>{result.summary}</pre>
          </li>
        ))}
      </ul>
    </section>
  );
}
