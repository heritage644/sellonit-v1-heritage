# Retaila API Contract

Canonical OpenAPI 3.1 contract for the Retaila MVP.

## Source of truth

`docs/openapi.yaml` is the API contract. Backend and frontend implementations must conform to it.

## Domain rules

1. `SupplierProduct` is the physical master product.
2. `RetailerProductListing` references `SupplierProduct`; it is not a duplicate master product.
3. Supplier inventory is the source of truth.
4. Customer `Order`, internal `Fulfillment`, and physical `Shipment` are separate resources.
5. One order may contain products from multiple suppliers.
6. Payment success is established by verified provider webhook/server-side verification, never frontend state.
7. Mutating operations that can be retried use `Idempotency-Key`.
8. Tenant-owned resources must be authorization scoped to the authenticated business/store.
9. Money is represented in minor units; NGN values therefore use kobo.
10. API errors use a stable machine-readable error code and request ID.

## MVP aggregation rules

- Early batch window: 2–3 days.
- Early volume trigger: 50 units for a supplier before the window closes.
- Demand is grouped by supplier/product.
- A released batch creates a consolidated Bulk Supply Request.
- Supplier sends bulk stock to an external 3PL hub.
- 3PL sorts individual shipments and performs last-mile delivery.
- Failed deliveries can enter `IN_HUB_HOLDING` for the defined holding period.

## CI contract gate

Install:

```text
npm install -D openapi-typescript @redocly/cli
```

Recommended scripts:

```json
{
  "generate:api": "openapi-typescript docs/openapi.yaml -o packages/shared/src/api.d.ts",
  "validate:api": "redocly lint docs/openapi.yaml"
}
```

The generated API types should be committed. CI should fail when the committed generated file is stale.

## Important implementation note

This contract intentionally defines the external API boundary. Internal Express module boundaries, Prisma models, queue payloads, and 3PL provider adapters may differ internally as long as the API contract remains stable.
