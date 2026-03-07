import { Injectable } from '@nestjs/common';
import { StoreContextPort } from '../ports';

@Injectable()
export class StubStoreContextService extends StoreContextPort {
  resolveStoreContext(params: {
    businessId: number;
    storeId?: number | null;
  }): Promise<{ storeId: number | null }> {
    const storeId =
      typeof params.storeId === 'number' && params.storeId > 0
        ? params.storeId
        : null;
    return Promise.resolve({ storeId });
  }
}
