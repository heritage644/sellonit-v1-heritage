import { defineModule, plannedRoute } from '../../http/route-definition.js';

/**
 * SupplierProduct — the physical MASTER product record, owned by a supplier
 * business, plus its pricing rule (FLEXIBLE / FIXED_MSRP / MAP). Retailer
 * listings reference these records; they never copy them. Stock lives in the
 * `inventory` module.
 */
export function createSupplierProductsModule() {
  return defineModule('supplier-products', [
    plannedRoute('get', '/supplier-products', { access: 'authenticated' }),
    plannedRoute('post', '/supplier-products', { access: 'authenticated', idempotencyKey: true }),
    plannedRoute('get', '/supplier-products/{supplierProductId}', { access: 'authenticated' }),
    plannedRoute('patch', '/supplier-products/{supplierProductId}', { access: 'authenticated' }),
    plannedRoute('post', '/supplier-products/{supplierProductId}/publish', {
      access: 'authenticated',
    }),
    plannedRoute('post', '/supplier-products/{supplierProductId}/unpublish', {
      access: 'authenticated',
    }),
    plannedRoute('put', '/supplier-products/{supplierProductId}/pricing-rule', {
      access: 'authenticated',
    }),
  ]);
}
