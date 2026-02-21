import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import {
  PAYMENTS_WEBHOOK_JOB,
  PAYMENTS_WEBHOOK_QUEUE,
  PaymentsWebhookJobPayload,
} from './payments-queue.constants';
import { PaymentsProcessorService } from './payments-processor.service';

@Processor(PAYMENTS_WEBHOOK_QUEUE)
export class PaymentsWebhookProcessor extends WorkerHost {
  private readonly logger = new Logger(PaymentsWebhookProcessor.name);

  constructor(private readonly processor: PaymentsProcessorService) {
    super();
  }

  async process(job: Job<PaymentsWebhookJobPayload>): Promise<void> {
    if (job.name !== PAYMENTS_WEBHOOK_JOB) {
      return;
    }

    const eventDbId = Number(job.data?.eventDbId);
    if (!Number.isFinite(eventDbId) || eventDbId <= 0) {
      return;
    }

    await this.processor.processEventById({ eventDbId });
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job | undefined, error: Error) {
    this.logger.warn(
      `Webhook job failed (id=${String(job?.id ?? 'n/a')}, name=${String(job?.name ?? 'n/a')}): ${error.message}`,
    );
  }
}
