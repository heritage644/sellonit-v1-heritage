import { defineModule, plannedRoute } from '../../http/route-definition.js';

/** Retailer storefronts owned by a business (management side). */
export function createStoresModule() {
  return defineModule('stores', [
    plannedRoute('get', '/businesses/{businessId}/stores', { access: 'authenticated' }),
    plannedRoute('post', '/businesses/{businessId}/stores', { access: 'authenticated' }),
    plannedRoute('get', '/stores/{storeId}', { access: 'authenticated' }),
    plannedRoute('patch', '/stores/{storeId}', { access: 'authenticated' }),
    plannedRoute('post', '/stores/{storeId}/publish', { access: 'authenticated' }),
    plannedRoute('post', '/stores/{storeId}/unpublish', { access: 'authenticated' }),
  ]);
}
