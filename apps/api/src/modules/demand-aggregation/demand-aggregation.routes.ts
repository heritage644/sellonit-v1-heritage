import { defineModule, plannedRoute } from '../../http/route-definition.js';

/**
 * Demand aggregation: demand from many retailer orders is grouped per
 * supplier into DemandBatches. A batch is released when its window expires or
 * its unit threshold is reached (MVP: 50 units, 2–3 day window), producing a
 * consolidated Bulk Supply Request. Batch evaluation will run in the worker
 * (queue `demand-aggregation`); these routes are the read/admin surface.
 */
export function createDemandAggregationModule() {
  return defineModule('demand-aggregation', [
    plannedRoute('get', '/demand-batches', { access: 'authenticated' }),
    plannedRoute('get', '/demand-batches/{batchId}', { access: 'authenticated' }),
    plannedRoute('post', '/demand-batches/{batchId}', {
      access: 'authenticated',
      idempotencyKey: true,
    }),
  ]);
}
