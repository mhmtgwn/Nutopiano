import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsWebhooksController } from './payments-webhooks.controller';
import { IyzicoProvider } from './providers/iyzico.provider';
import { PaymentsProcessorService } from './payments-processor.service';
import { PaymentsAdminController } from './payments-admin.controller';
import { PaymentsIyzicoController } from './payments-iyzico.controller';

@Module({
  controllers: [PaymentsWebhooksController, PaymentsAdminController, PaymentsIyzicoController],
  providers: [
    PaymentsService,
    IyzicoProvider,
    PaymentsProcessorService,
  ],
  exports: [PaymentsService, PaymentsProcessorService],
})
export class PaymentsModule {}
