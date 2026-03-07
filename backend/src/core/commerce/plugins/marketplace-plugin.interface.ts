import { CommercePlugin } from './plugin.interface';

export abstract class MarketplacePlugin extends CommercePlugin {
  readonly kind = 'marketplaces' as const;

  abstract pushProduct(params: {
    businessId: number;
    productId: number;
    storeId?: number | null;
  }): Promise<void>;

  abstract pullOrder(params: {
    businessId: number;
    externalOrderId: string;
    storeId?: number | null;
  }): Promise<void>;
}
