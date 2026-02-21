import { Module } from '@nestjs/common';
import { CustomersController } from './customers.controller';
import { CustomerPortalController } from './customer-portal.controller';
import { PlatformCustomersController } from './platform-customers.controller';
import { CustomersService } from './customers.service';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [OrdersModule],
  controllers: [
    CustomersController,
    CustomerPortalController,
    PlatformCustomersController,
  ],
  providers: [CustomersService],
})
export class CustomersModule {}
