import { defineModule, plannedRoute } from '../../http/route-definition.js';

/**
 * Supplier physical stock — the inventory source of truth. Every change
 * (adjustments, checkout reservations, releases) must run inside a database
 * transaction with optimistic concurrency on `Inventory.version`.
 */
export function createInventoryModule() {
  return defineModule('inventory', [
    plannedRoute('get', '/supplier-products/{supplierProductId}/inventory', {
      access: 'authenticated',
    }),
    plannedRoute('post', '/supplier-products/{supplierProductId}/inventory', {
      access: 'authenticated',
      idempotencyKey: true,
    }),
  ]);
}
