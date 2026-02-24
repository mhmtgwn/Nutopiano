import { Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '@common/decorators';
import { JwtAuthGuard, RolesGuard } from '@common/guards';
import { JwtPayload } from '../../auth/types/jwt-payload';
import { PaymentsService } from './payments.service';
import { PaymentsProcessorService } from './payments-processor.service';

@ApiTags('payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('payments/admin')
export class PaymentsAdminController {
  constructor(
    private readonly processor: PaymentsProcessorService,
    private readonly payments: PaymentsService,
  ) {}

  @Get('webhook-events')
  @Roles('ADMIN', 'USER')
  @ApiOperation({
    summary: 'List payment webhook events',
    description:
      'Lists recorded webhook events for the current business. Useful for debugging and for manually triggering processing.',
  })
  @ApiOkResponse({ description: 'OK' })
  listWebhookEvents(
    @Req() req: { user: JwtPayload },
    @Query('provider') provider?: string,
    @Query('status') status?: string,
  ) {
    return this.payments.listWebhookEvents({
      businessId: Number(req.user.businessId),
      provider: provider ? provider.toUpperCase() : undefined,
      status: status ? status.toUpperCase() : undefined,
    });
  }

  @Post('process-webhooks')
  @Roles('ADMIN', 'USER')
  @ApiOperation({
    summary: 'Process received payment webhooks',
    description:
      'Processes webhook events previously recorded in DB. Idempotent: events are marked PROCESSED/FAILED and will not be re-processed.',
  })
  @ApiOkResponse({ description: 'OK' })
  processWebhooks(
    @Req() req: { user: JwtPayload },
    @Query('provider') provider?: string,
    @Query('limit') limit?: string,
  ) {
    return this.processor.processReceivedEvents({
      provider: (provider ?? 'IYZICO').toUpperCase(),
      limit: limit ? Number(limit) : undefined,
      businessId: Number(req.user.businessId),
    });
  }
}

