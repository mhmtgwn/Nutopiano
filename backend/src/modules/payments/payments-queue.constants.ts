export const PAYMENTS_WEBHOOK_QUEUE = 'payments:webhooks';
export const PAYMENTS_WEBHOOK_JOB = 'payments.webhook.process';

export type PaymentsWebhookJobPayload = {
  eventDbId: number;
};
