import type { RequestHandler } from 'express';
import type { HealthResponse } from '@sellonit/shared';
import { AppError } from '../../http/app-error.js';
import { defineModule, route, type ApiModule } from '../../http/route-definition.js';
import type { ReadinessService } from './health.service.js';

export function createHealthModule(deps: {
  serviceName: string;
  readiness: ReadinessService;
}): ApiModule {
  const liveness: RequestHandler = (_req, res) => {
    const body: HealthResponse = {
      status: 'ok',
      service: deps.serviceName,
      timestamp: new Date().toISOString(),
    };
    res.set('Cache-Control', 'no-store').json(body);
  };

  const readiness: RequestHandler = async (_req, res) => {
    const result = await deps.readiness.evaluate();
    res.set('Cache-Control', 'no-store');

    if (!result.ready) {
      throw AppError.serviceUnavailable(
        'One or more dependencies are not ready',
        result.checks
          .filter((check) => check.status === 'down')
          .map((check) => ({
            field: check.name,
            code: check.reason ?? 'error',
            message: `${check.name} is not ready`,
          })),
      );
    }

    const body: HealthResponse = {
      status: 'ready',
      service: deps.serviceName,
      timestamp: new Date().toISOString(),
    };
    res.json(body);
  };

  return defineModule('health', [
    route('get', '/health', { access: 'public', rateLimit: 'none', handlers: [liveness] }),
    route('get', '/health/ready', { access: 'public', rateLimit: 'none', handlers: [readiness] }),
  ]);
}
