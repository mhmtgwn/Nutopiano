export abstract class SearchPort {
  abstract queueProductIndex(params: {
    businessId: number;
    productId: number;
  }): Promise<void>;
}
