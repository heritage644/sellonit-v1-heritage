import { defineModule, plannedRoute } from '../../http/route-definition.js';

/** Read-only store and supplier overview metrics. */
export function createAnalyticsModule() {
  return defineModule('analytics', [
    plannedRoute('get', '/analytics/stores/{storeId}/overview', { access: 'authenticated' }),
    plannedRoute('get', '/analytics/suppliers/{businessId}/overview', { access: 'authenticated' }),
  ]);
}
