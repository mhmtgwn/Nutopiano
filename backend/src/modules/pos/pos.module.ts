import { Module } from '@nestjs/common';
import { CommerceModule } from '../../core/commerce';
import { PaymentsModule } from '../payments/payments.module';
import { PosController } from './pos.controller';
import { PosService } from './pos.service';

@Module({
  imports: [CommerceModule, PaymentsModule],
  controllers: [PosController],
  providers: [PosService],
})
export class PosModule {}

