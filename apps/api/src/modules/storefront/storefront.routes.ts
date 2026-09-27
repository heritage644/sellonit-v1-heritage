import { defineModule, plannedRoute } from '../../http/route-definition.js';

/**
 * Public, unauthenticated read model of PUBLISHED stores and listings, as
 * seen by customers. Kept apart from the `stores`/`listings` management
 * modules so that public exposure is an explicit, reviewable boundary.
 */
export function createStorefrontModule() {
  return defineModule('storefront', [
    plannedRoute('get', '/public/stores/{storeSlug}', { access: 'public' }),
    plannedRoute('get', '/public/stores/{storeSlug}/products', { access: 'public' }),
    plannedRoute('get', '/public/stores/{storeSlug}/products/{listingId}', { access: 'public' }),
  ]);
}
