import type { components } from './api.js';

type S = components['schemas'];

/**
 * Declares a runtime list of enum values that is checked against the contract
 * at compile time:
 *  - a value that is not in the contract enum is a type error;
 *  - a contract enum value missing from the list is a type error that names
 *    the missing member (via the `__missingFromContractEnum` property).
 *
 * If `docs/openapi.yaml` changes an enum and `npm run generate:api` is run,
 * `npm run typecheck` fails until this file is updated — the runtime values
 * can never silently drift from the contract.
 */
function contractEnum<T extends string>() {
  return <const V extends readonly [T, ...T[]]>(
    values: V &
      ([T] extends [V[number]] ? unknown : { __missingFromContractEnum: Exclude<T, V[number]> }),
  ): V => values;
}

export const USER_ROLES = contractEnum<S['UserRole']>()([
  'OWNER',
  'ADMIN',
  'STAFF',
  'SUPPLIER',
  'RETAILER',
]);

export const BUSINESS_TYPES = contractEnum<S['BusinessType']>()([
  'ENTREPRENEUR',
  'SUPPLIER',
  'ENTERPRISE',
  'RETAILER',
]);

export const USER_STATUSES = contractEnum<S['UserStatus']>()([
  'PENDING_VERIFICATION',
  'ACTIVE',
  'SUSPENDED',
  'DEACTIVATED',
]);

export const STORE_STATUSES = contractEnum<S['StoreStatus']>()([
  'DRAFT',
  'PUBLISHED',
  'UNPUBLISHED',
  'SUSPENDED',
]);

export const PRODUCT_STATUSES = contractEnum<S['ProductStatus']>()([
  'DRAFT',
  'PUBLISHED',
  'UNPUBLISHED',
  'ARCHIVED',
]);

export const LISTING_STATUSES = contractEnum<S['ListingStatus']>()([
  'DRAFT',
  'PUBLISHED',
  'UNPUBLISHED',
  'ARCHIVED',
]);

export const PRICING_RULE_TYPES = contractEnum<S['PricingRuleType']>()([
  'FLEXIBLE',
  'FIXED_MSRP',
  'MAP',
]);

export const ORDER_STATUSES = contractEnum<S['OrderStatus']>()([
  'PENDING_PAYMENT',
  'PAID',
  'PROCESSING',
  'FULFILLING',
  'PARTIALLY_FULFILLED',
  'SHIPPED',
  'DELIVERED',
  'COMPLETED',
  'CANCELLED',
  'FAILED',
]);

export const PAYMENT_STATUSES = contractEnum<S['PaymentStatus']>()([
  'PENDING',
  'PROCESSING',
  'SUCCESS',
  'FAILED',
  'REVERSED',
  'REFUNDED',
]);

export const FULFILLMENT_STATUSES = contractEnum<S['FulfillmentStatus']>()([
  'PENDING',
  'BATCHING',
  'AWAITING_SUPPLY',
  'SUPPLY_RECEIVED',
  'ALLOCATED',
  'PACKED',
  'SHIPPED',
  'COMPLETED',
  'FAILED',
  'CANCELLED',
]);

export const SHIPMENT_STATUSES = contractEnum<S['ShipmentStatus']>()([
  'PENDING',
  'LABEL_CREATED',
  'AT_3PL_HUB',
  'SORTING',
  'DISPATCHED',
  'IN_TRANSIT',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'DELIVERY_FAILED',
  'IN_HUB_HOLDING',
  'RETURNING',
  'RETURNED',
  'CANCELLED',
]);

export const DEMAND_BATCH_STATUSES = contractEnum<S['DemandBatchStatus']>()([
  'OPEN',
  'THRESHOLD_REACHED',
  'TIME_EXPIRED',
  'LOCKED',
  'RELEASED',
  'COMPLETED',
  'CANCELLED',
]);

export const BULK_SUPPLY_STATUSES = contractEnum<S['BulkSupplyStatus']>()([
  'DRAFT',
  'SENT',
  'ACKNOWLEDGED',
  'PREPARING',
  'IN_TRANSIT',
  'RECEIVED',
  'PARTIALLY_RECEIVED',
  'COMPLETED',
  'CANCELLED',
]);

export const INVENTORY_ADJUSTMENT_REASONS = contractEnum<
  S['InventoryAdjustmentRequest']['reason']
>()([
  'INITIAL_STOCK',
  'RESTOCK',
  'CORRECTION',
  'DAMAGE',
  'LOSS',
  'RETURNED_STOCK',
  'MANUAL_ADJUSTMENT',
]);

export const CURRENCIES = contractEnum<S['Currency']>()(['NGN']);
