import { defineModule, plannedRoute } from '../../http/route-definition.js';

/**
 * Fulfillment — how a paid order is sourced and prepared, per supplier. One
 * order may produce several fulfillments (one per supplier). Order creation
 * does not mean stock has reached the 3PL hub: fulfillments move through
 * BATCHING → AWAITING_SUPPLY → SUPPLY_RECEIVED → ALLOCATED → PACKED → SHIPPED.
 */
export function createFulfillmentModule() {
  return defineModule('fulfillment', [
    plannedRoute('get', '/fulfillments', { access: 'authenticated' }),
    plannedRoute('get', '/fulfillments/{fulfillmentId}', { access: 'authenticated' }),
    plannedRoute('patch', '/fulfillments/{fulfillmentId}', { access: 'authenticated' }),
  ]);
}
