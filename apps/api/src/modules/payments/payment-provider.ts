import type { Money, Schema } from '@sellonit/shared';

/**
 * Port for payment service providers (Paystack first, others later). Provider
 * adapters live under `payments/providers/<name>/` and are selected by
 * configuration. None is implemented yet.
 */
export interface PaymentProvider {
  /** Stable identifier stored on `Payment.provider`, e.g. `paystack`. */
  readonly name: string;

  initialize(input: {
    /** Sellonit-generated reference, unique per payment attempt. */
    reference: string;
    amount: Money;
    customerEmail: string | undefined;
    callbackUrl: string;
  }): Promise<{ authorizationUrl: string; providerReference: string }>;

  /** Authoritative server-side verification. Never trust redirect query parameters. */
  verify(providerReference: string): Promise<{
    status: Schema<'PaymentStatus'>;
    amount: Money;
    paidAt: string | null;
  }>;
}
