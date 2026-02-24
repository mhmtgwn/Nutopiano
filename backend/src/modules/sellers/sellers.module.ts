import { Module } from '@nestjs/common';
import { EmailModule } from '../../email/email.module';
import { ProductsModule } from '../products/products.module';
import {
  InviteDeliveryEmailAdapter,
  InviteDeliverySmsAdapter,
} from './invite-delivery.adapters';
import { SellerInviteDeliveryService } from './invite-delivery.service';
import { PublicSellersController } from './public-sellers.controller';
import { SellersController } from './sellers.controller';
import { SellersService } from './sellers.service';

@Module({
  imports: [ProductsModule, EmailModule],
  controllers: [PublicSellersController, SellersController],
  providers: [
    SellersService,
    SellerInviteDeliveryService,
    InviteDeliveryEmailAdapter,
    InviteDeliverySmsAdapter,
  ],
})
export class SellersModule {}
