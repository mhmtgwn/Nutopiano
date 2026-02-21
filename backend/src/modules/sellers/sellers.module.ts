import { Module } from '@nestjs/common';
import { ProductsModule } from '../products/products.module';
import { PublicSellersController } from './public-sellers.controller';
import { SellersController } from './sellers.controller';
import { SellersService } from './sellers.service';

@Module({
  imports: [ProductsModule],
  controllers: [PublicSellersController, SellersController],
  providers: [SellersService],
})
export class SellersModule {}
