import { defineModule, plannedRoute } from '../../http/route-definition.js';

/** Read model: PUBLISHED supplier products that retailers can browse and list. */
export function createCatalogueModule() {
  return defineModule('catalogue', [
    plannedRoute('get', '/catalogue/products', { access: 'authenticated' }),
    plannedRoute('get', '/catalogue/products/{supplierProductId}', { access: 'authenticated' }),
  ]);
}
