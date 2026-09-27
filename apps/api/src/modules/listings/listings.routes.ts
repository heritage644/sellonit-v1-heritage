import { defineModule, plannedRoute } from '../../http/route-definition.js';

/**
 * RetailerProductListing — a store-specific listing that REFERENCES a
 * SupplierProduct (selling price, display overrides). It is never a duplicate
 * master product; availability derives from supplier inventory.
 */
export function createListingsModule() {
  return defineModule('listings', [
    plannedRoute('get', '/stores/{storeId}/listings', { access: 'authenticated' }),
    plannedRoute('post', '/stores/{storeId}/listings', {
      access: 'authenticated',
      idempotencyKey: true,
    }),
    plannedRoute('get', '/stores/{storeId}/listings/{listingId}', { access: 'authenticated' }),
    plannedRoute('patch', '/stores/{storeId}/listings/{listingId}', { access: 'authenticated' }),
    plannedRoute('delete', '/stores/{storeId}/listings/{listingId}', { access: 'authenticated' }),
    plannedRoute('post', '/stores/{storeId}/listings/{listingId}/publish', {
      access: 'authenticated',
    }),
    plannedRoute('post', '/stores/{storeId}/listings/{listingId}/unpublish', {
      access: 'authenticated',
    }),
  ]);
}
