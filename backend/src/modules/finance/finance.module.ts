import { Module } from '@nestjs/common';
import { FinanceController } from './finance.controller';
import { FinanceService } from './finance.service';
import { CommerceModule } from '../../core/commerce';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [SettingsModule, CommerceModule],
  controllers: [FinanceController],
  providers: [FinanceService],
  exports: [FinanceService],
})
export class FinanceModule {}
