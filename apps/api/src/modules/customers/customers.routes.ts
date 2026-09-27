import { defineModule, plannedRoute } from '../../http/route-definition.js';

/** Customers of a store (store-scoped; visible to the owning retailer only). */
export function createCustomersModule() {
  return defineModule('customers', [
    plannedRoute('get', '/stores/{storeId}/customers', { access: 'authenticated' }),
    plannedRoute('get', '/stores/{storeId}/customers/{customerId}', { access: 'authenticated' }),
  ]);
}
