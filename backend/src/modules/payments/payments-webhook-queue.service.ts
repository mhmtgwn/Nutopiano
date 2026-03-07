import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { STANDARD_QUEUE_JOB_OPTIONS } from '../../common/queue/queue.constants';
import {
  PAYMENTS_WEBHOOK_JOB,
  PAYMENTS_WEBHOOK_QUEUE,
  PaymentsWebhookJobPayload,
} from './payments-queue.constants';

@Injectable()
export class PaymentsWebhookQueueService {
  constructor(
    @InjectQueue(PAYMENTS_WEBHOOK_QUEUE)
    private readonly queue: Queue<PaymentsWebhookJobPayload>,
  ) {}

  async enqueueProcessEvent(payload: PaymentsWebhookJobPayload) {
    await this.queue.add(PAYMENTS_WEBHOOK_JOB, payload, {
      jobId: `event:${payload.eventDbId}`,
      ...STANDARD_QUEUE_JOB_OPTIONS,
    });
  }
}
