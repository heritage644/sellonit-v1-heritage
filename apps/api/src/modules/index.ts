import type { ApiModule } from '../http/route-definition.js';
import { createAnalyticsModule } from './analytics/analytics.routes.js';
import { createAuthModule } from './auth/auth.routes.js';
import { createBulkSupplyModule } from './bulk-supply/bulk-supply.routes.js';
import { createBusinessesModule } from './businesses/businesses.routes.js';
import { createCartsModule } from './carts/carts.routes.js';
import { createCatalogueModule } from './catalogue/catalogue.routes.js';
import { createCustomersModule } from './customers/customers.routes.js';
import { createDemandAggregationModule } from './demand-aggregation/demand-aggregation.routes.js';
import { createFulfillmentModule } from './fulfillment/fulfillment.routes.js';
import { createHealthModule } from './health/health.routes.js';
import type { ReadinessService } from './health/health.service.js';
import { createInventoryModule } from './inventory/inventory.routes.js';
import { createListingsModule } from './listings/listings.routes.js';
import { createLogisticsModule } from './logistics/logistics.routes.js';
import { createNotificationsModule } from './notifications/notifications.routes.js';
import { createOrdersModule } from './orders/orders.routes.js';
import { createPaymentsModule } from './payments/payments.routes.js';
import { createRetailersModule } from './retailers/retailers.routes.js';
import { createShipmentsModule } from './shipments/shipments.routes.js';
import { createStorefrontModule } from './storefront/storefront.routes.js';
import { createStoresModule } from './stores/stores.routes.js';
import { createSupplierProductsModule } from './supplier-products/supplier-products.routes.js';
import { createSuppliersModule } from './suppliers/suppliers.routes.js';
import { createUsersModule } from './users/users.routes.js';

export interface ModuleDependencies {
  serviceName: string;
  readiness: ReadinessService;
  webhookSecrets: { payments: string | undefined; threePl: string | undefined };
}

/**
 * The complete list of API modules. Each module receives only the
 * dependencies it needs; modules never import each other's internals.
 */
export function createModules(deps: ModuleDependencies): ApiModule[] {
  return [
    createHealthModule({ serviceName: deps.serviceName, readiness: deps.readiness }),
    createAuthModule(),
    createUsersModule(),
    createBusinessesModule(),
    createSuppliersModule(),
    createRetailersModule(),
    createStoresModule(),
    createStorefrontModule(),
    createSupplierProductsModule(),
    createInventoryModule(),
    createCatalogueModule(),
    createListingsModule(),
    createCustomersModule(),
    createCartsModule(),
    createOrdersModule(),
    createPaymentsModule({ webhookSecret: deps.webhookSecrets.payments }),
    createFulfillmentModule(),
    createDemandAggregationModule(),
    createBulkSupplyModule(),
    createShipmentsModule(),
    createLogisticsModule({ webhookSecret: deps.webhookSecrets.threePl }),
    createNotificationsModule(),
    createAnalyticsModule(),
  ];
}
