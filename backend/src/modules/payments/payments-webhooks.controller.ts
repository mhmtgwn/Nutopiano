import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  Post,
  Req,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import { PaymentsService } from './payments.service';
import { PaymentsProcessorService } from './payments-processor.service';
import { ReceiveWebhookDto } from './dto/receive-webhook.dto';
import { IyzicoProvider } from './providers/iyzico.provider';

type RequestWithRawBody = {
  rawBody?: Buffer;
};

@ApiTags('payments')
@Controller('payments/webhooks')
export class PaymentsWebhooksController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly paymentsProcessor: PaymentsProcessorService,
    private readonly iyzico: IyzicoProvider,
  ) {}

  @Post('iyzico')
  @ApiOperation({
    summary: 'Iyzico webhook receiver',
    description:
      'Receives Iyzico webhook events and stores them for idempotent processing.',
  })
  @ApiOkResponse({ description: 'OK' })
  async receiveIyzicoWebhook(
    @Req() req: RequestWithRawBody,
    @Body() body: ReceiveWebhookDto,
    @Headers('x-iyz-signature-v3') signatureV3?: string,
    @Headers('x-iyzi-signature') signatureLegacy?: string,
  ) {
    const eventId = body.eventId.trim();
    if (!eventId) {
      throw new BadRequestException('eventId is required');
    }

    const rawBody = req?.rawBody;
    if (!rawBody || !(rawBody instanceof Buffer)) {
      throw new BadRequestException('rawBody is required for signature verification');
    }

    const signature = signatureV3 ?? signatureLegacy;
    const verified = this.iyzico.verifyWebhookSignature({
      rawBody,
      payload: body.payload,
      signature,
    });
    if (!verified.ok) {
      throw new BadRequestException(
        verified.reason === 'missing_signature'
          ? 'Missing webhook signature'
          : 'Invalid webhook signature',
      );
    }

    if (body.payload === undefined || body.payload === null) {
      throw new BadRequestException('payload is required');
    }

    const payload = body.payload as Prisma.InputJsonValue;

    const recorded = await this.paymentsService.recordWebhookEvent({
      provider: 'IYZICO',
      eventId,
      eventType: body.eventType,
      payload,
      signature,
      businessId: body.businessId,
    });

    if (recorded.created && recorded.eventDbId) {
      void this.paymentsProcessor.processEventById({
        eventDbId: recorded.eventDbId,
      });
    }

    return recorded;
  }
}
