export type StoreContext = {
  storeId: number | null;
};

export abstract class StoreContextPort {
  abstract resolveStoreContext(params: {
    businessId: number;
    storeId?: number | null;
  }): Promise<StoreContext>;
}
