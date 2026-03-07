import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsWebhooksController } from './payments-webhooks.controller';
import { IyzicoProvider } from './providers/iyzico.provider';
import { PaymentsProcessorService } from './payments-processor.service';
import { PaymentsAdminController } from './payments-admin.controller';
import { PaymentsIyzicoController } from './payments-iyzico.controller';
import { PaymentsPort } from '../../core/commerce';

@Module({
  controllers: [
    PaymentsWebhooksController,
    PaymentsAdminController,
    PaymentsIyzicoController,
  ],
  providers: [
    PaymentsService,
    IyzicoProvider,
    PaymentsProcessorService,
    {
      provide: PaymentsPort,
      useExisting: PaymentsService,
    },
  ],
  exports: [PaymentsService, PaymentsProcessorService, PaymentsPort],
})
export class PaymentsModule {}
