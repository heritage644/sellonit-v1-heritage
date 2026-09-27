# Sellonit Contract Engineering Rules

## Versioning
- Base path is `/v1`.
- Breaking API changes require a new API version.
- Additive optional response fields are normally non-breaking.
- Removing/renaming fields, changing meanings, or tightening validation is breaking.

## HTTP semantics
- `GET` is read-only.
- `POST` creates/actions.
- `PATCH` partially updates.
- `PUT` replaces a singleton resource such as a role-specific profile or pricing rule.
- `DELETE` removes/unpublishes an owned relationship when allowed.
- `204` contains no response body.

## Concurrency
Inventory changes must run inside a database transaction. Checkout must validate price and stock against authoritative database state. Idempotency keys prevent duplicate payment/order actions.

## Authorization
Authorization is based on the authenticated user plus business membership and resource ownership. A valid JWT alone is never sufficient to access arbitrary business resources.

## Payment
The browser may initiate payment but cannot mark an order paid. Provider webhook verification is authoritative.

## Fulfillment
Order creation does not mean supplier stock has physically arrived at the 3PL. Fulfillment and shipment states track the operational pipeline separately.
