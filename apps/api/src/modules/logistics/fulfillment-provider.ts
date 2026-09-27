import type { Schema } from '@sellonit/shared';

type Address = Schema<'Address'>;
type ShipmentStatus = Schema<'ShipmentStatus'>;

/**
 * Port for third-party logistics (3PL) providers: hub intake, sorting and
 * last-mile delivery. Sellonit is never bound to one logistics company; each
 * provider gets an adapter under `logistics/providers/<name>/`, selected by
 * configuration. None is implemented yet.
 *
 * Naming note: this is the external provider port. It is distinct from the
 * internal `Fulfillment` resource (order sourcing), which lives in the
 * `fulfillment` module.
 */
export interface FulfillmentProvider {
  /** Stable identifier stored on `Shipment.provider`. */
  readonly name: string;

  createShipment(input: {
    shipmentId: string;
    hubId: string | null;
    destination: Address;
    parcels: readonly { weightGrams: number; description: string }[];
  }): Promise<{ providerShipmentId: string; trackingNumber: string | null }>;

  cancelShipment(providerShipmentId: string): Promise<void>;

  /** Map a signature-verified webhook payload to normalized shipment events. */
  parseWebhookEvent(payload: unknown): readonly {
    providerShipmentId: string;
    status: ShipmentStatus;
    occurredAt: string;
    location: string | null;
    note: string | null;
  }[];
}
