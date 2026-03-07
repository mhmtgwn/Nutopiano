import { Module } from '@nestjs/common';
import { CommerceCalculationService } from './commerce-calculation.service';
import { LedgerPostingService } from './ledger';
import {
  CatalogReadPort,
  InventoryPort,
  OrderLifecyclePolicy,
  PricingPort,
  SearchPort,
  StoreContextPort,
} from './ports';
import {
  DefaultOrderLifecyclePolicy,
  DefaultPricingPortService,
  LegacyInventoryService,
  PrismaCatalogReadService,
  StubSearchService,
  StubStoreContextService,
} from './services';

@Module({
  providers: [
    CommerceCalculationService,
    LedgerPostingService,
    PrismaCatalogReadService,
    LegacyInventoryService,
    DefaultPricingPortService,
    DefaultOrderLifecyclePolicy,
    StubStoreContextService,
    StubSearchService,
    {
      provide: CatalogReadPort,
      useExisting: PrismaCatalogReadService,
    },
    {
      provide: InventoryPort,
      useExisting: LegacyInventoryService,
    },
    {
      provide: PricingPort,
      useExisting: DefaultPricingPortService,
    },
    {
      provide: OrderLifecyclePolicy,
      useExisting: DefaultOrderLifecyclePolicy,
    },
    {
      provide: StoreContextPort,
      useExisting: StubStoreContextService,
    },
    {
      provide: SearchPort,
      useExisting: StubSearchService,
    },
  ],
  exports: [
    CommerceCalculationService,
    LedgerPostingService,
    CatalogReadPort,
    InventoryPort,
    PricingPort,
    OrderLifecyclePolicy,
    StoreContextPort,
    SearchPort,
  ],
})
export class CommerceModule {}
