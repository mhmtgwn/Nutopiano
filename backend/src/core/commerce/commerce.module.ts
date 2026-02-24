import { Module } from '@nestjs/common';
import { CommerceCalculationService } from './commerce-calculation.service';
import { LedgerPostingService } from './ledger';

@Module({
  providers: [CommerceCalculationService, LedgerPostingService],
  exports: [CommerceCalculationService, LedgerPostingService],
})
export class CommerceModule {}
