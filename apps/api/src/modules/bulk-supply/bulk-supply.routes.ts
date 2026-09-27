import { defineModule, plannedRoute } from '../../http/route-definition.js';

/**
 * Bulk Supply Requests: the consolidated order a released demand batch sends
 * to a supplier, who ships bulk stock to a 3PL hub. Receipt (full/partial)
 * unblocks the related fulfillments.
 */
export function createBulkSupplyModule() {
  return defineModule('bulk-supply', [
    plannedRoute('get', '/bulk-supply-requests', { access: 'authenticated' }),
    plannedRoute('get', '/bulk-supply-requests/{requestId}', { access: 'authenticated' }),
    plannedRoute('patch', '/bulk-supply-requests/{requestId}', { access: 'authenticated' }),
  ]);
}
