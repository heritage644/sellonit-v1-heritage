import { defineModule, plannedRoute } from '../../http/route-definition.js';

/** Retailer role profile of a business (singleton, PUT = replace). */
export function createRetailersModule() {
  return defineModule('retailers', [
    plannedRoute('get', '/businesses/{businessId}/retailer-profile', { access: 'authenticated' }),
    plannedRoute('put', '/businesses/{businessId}/retailer-profile', { access: 'authenticated' }),
  ]);
}
