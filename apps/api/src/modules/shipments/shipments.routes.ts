import { defineModule, plannedRoute } from '../../http/route-definition.js';

/**
 * Shipment — the physical movement of goods to the customer, with its event
 * history. Created from fulfillments; status updates arrive from 3PL
 * providers through the `logistics` module.
 */
export function createShipmentsModule() {
  return defineModule('shipments', [
    plannedRoute('get', '/shipments', { access: 'authenticated' }),
    plannedRoute('get', '/shipments/{shipmentId}', { access: 'authenticated' }),
    plannedRoute('get', '/shipments/{shipmentId}/events', { access: 'authenticated' }),
  ]);
}
