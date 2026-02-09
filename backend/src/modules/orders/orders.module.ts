import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { OrderStatusModule } from '../order-status/order-status.module';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [OrderStatusModule, SettingsModule],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
