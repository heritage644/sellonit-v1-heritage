import { defineModule, plannedRoute } from '../../http/route-definition.js';

/** Supplier/manufacturer role profile of a business (singleton, PUT = replace). */
export function createSuppliersModule() {
  return defineModule('suppliers', [
    plannedRoute('get', '/businesses/{businessId}/supplier-profile', { access: 'authenticated' }),
    plannedRoute('put', '/businesses/{businessId}/supplier-profile', { access: 'authenticated' }),
  ]);
}
