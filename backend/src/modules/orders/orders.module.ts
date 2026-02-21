import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { PlatformOrdersController } from './platform-orders.controller';
import { OrderStatusModule } from '../order-status/order-status.module';
import { SettingsModule } from '../settings/settings.module';
import { FinanceModule } from '../finance/finance.module';

@Module({
  imports: [OrderStatusModule, SettingsModule, FinanceModule],
  controllers: [OrdersController, PlatformOrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
