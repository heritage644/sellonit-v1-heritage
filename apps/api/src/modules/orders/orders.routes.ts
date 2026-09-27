import type { RequestHandler } from 'express';
import { ERROR_CODES } from '@sellonit/shared';
import { AppError } from '../../http/app-error.js';
import { defineModule, plannedRoute, route } from '../../http/route-definition.js';

/**
 * Customer Order — the commercial transaction only. Order ≠ Fulfillment ≠
 * Shipment: sourcing lives in `fulfillment`, physical movement in `shipments`.
 * Checkout validates price and stock against the database inside a
 * transaction and creates a PENDING_PAYMENT order; only a verified payment
 * webhook may move it to PAID.
 */
export function createOrdersModule() {
  // The contract defines `POST /orders/{orderId}` as reserved: it always answers 405.
  const methodNotAllowed: RequestHandler = (_req, _res, next) => {
    next(
      new AppError(405, ERROR_CODES.METHOD_NOT_ALLOWED, 'Use POST /v1/checkout to create orders', {
        headers: { Allow: 'GET' },
      }),
    );
  };

  return defineModule('orders', [
    plannedRoute('post', '/checkout', { access: 'public', idempotencyKey: true }),
    plannedRoute('get', '/orders', { access: 'authenticated' }),
    plannedRoute('get', '/orders/{orderId}', { access: 'authenticated' }),
    route('post', '/orders/{orderId}', {
      access: 'authenticated',
      // Answers 405 without reading any order, so no resource check applies.
      authorization: 'no-resource-access',
      handlers: [methodNotAllowed],
    }),
    plannedRoute('post', '/orders/{orderId}/cancel', {
      access: 'authenticated',
      idempotencyKey: true,
    }),
  ]);
}
