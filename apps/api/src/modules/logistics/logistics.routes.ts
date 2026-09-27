import { verifyWebhookSignature } from '../../http/middleware/webhook-signature.js';
import { defineModule, plannedRoute } from '../../http/route-definition.js';

export const THREE_PL_SIGNATURE_HEADER = 'X-Webhook-Signature';

/**
 * 3PL integration boundary: inbound provider webhooks and (later) outbound
 * provider calls through `FulfillmentProvider` adapters. Translates provider
 * data into Shipment/ShipmentEvent updates owned by the `shipments` module.
 */
export function createLogisticsModule(deps: { webhookSecret: string | undefined }) {
  return defineModule('logistics', [
    plannedRoute('post', '/webhooks/3pl', {
      access: 'public',
      rateLimit: 'none',
      before: [
        verifyWebhookSignature({
          header: THREE_PL_SIGNATURE_HEADER,
          secret: deps.webhookSecret,
          algorithm: 'sha256',
        }),
      ],
    }),
  ]);
}
