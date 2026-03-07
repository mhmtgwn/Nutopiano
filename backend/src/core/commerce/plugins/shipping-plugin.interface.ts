import { CommercePlugin } from './plugin.interface';

export abstract class ShippingPlugin extends CommercePlugin {
  readonly kind = 'shipping' as const;

  abstract createShipment(params: {
    businessId: number;
    orderId: number;
    storeId?: number | null;
  }): Promise<{
    externalShipmentId: string;
    trackingNumber?: string | null;
    raw?: Record<string, unknown>;
  }>;

  abstract cancelShipment(params: {
    businessId: number;
    orderId: number;
    externalShipmentId: string;
  }): Promise<void>;
}
