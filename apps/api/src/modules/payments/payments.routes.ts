import { verifyWebhookSignature } from '../../http/middleware/webhook-signature.js';
import { defineModule, plannedRoute } from '../../http/route-definition.js';

export const PAYMENT_SIGNATURE_HEADER = 'X-Payment-Signature';

/**
 * Customer payments. The browser may initiate a payment but can never mark an
 * order paid: payment success is established only by a signature-verified
 * provider webhook and/or server-side verification through a `PaymentProvider`.
 */
export function createPaymentsModule(deps: { webhookSecret: string | undefined }) {
  return defineModule('payments', [
    plannedRoute('post', '/payments/initialize', { access: 'public', idempotencyKey: true }),
    plannedRoute('get', '/payments/{paymentId}', { access: 'authenticated' }),
    plannedRoute('post', '/webhooks/payments', {
      access: 'public',
      rateLimit: 'none',
      before: [
        // HMAC-SHA512 of the raw body matches Paystack, the contract's example
        // provider. See docs/contract-review.md: the contract's header name
        // does not match any real provider's header yet.
        verifyWebhookSignature({
          header: PAYMENT_SIGNATURE_HEADER,
          secret: deps.webhookSecret,
          algorithm: 'sha512',
        }),
      ],
    }),
  ]);
}
