import { defineModule, plannedRoute } from '../../http/route-definition.js';

/**
 * Guest carts (public per contract). Prices shown in a cart are informational;
 * checkout re-prices every line from authoritative database state and never
 * trusts client-supplied prices.
 */
export function createCartsModule() {
  return defineModule('carts', [
    plannedRoute('post', '/carts', { access: 'public', idempotencyKey: true }),
    plannedRoute('get', '/carts/{cartId}', { access: 'public' }),
    plannedRoute('patch', '/carts/{cartId}', { access: 'public' }),
    plannedRoute('post', '/carts/{cartId}/items', { access: 'public' }),
    plannedRoute('patch', '/carts/{cartId}/items/{itemId}', { access: 'public' }),
    plannedRoute('delete', '/carts/{cartId}/items/{itemId}', { access: 'public' }),
  ]);
}
