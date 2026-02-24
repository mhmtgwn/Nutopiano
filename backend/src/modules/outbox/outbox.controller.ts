import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '@common/decorators';
import { JwtAuthGuard, RolesGuard } from '@common/guards';
import { JwtPayload } from '../../auth/types/jwt-payload';
import { CreateOutboxTestEventDto } from './dto/create-outbox-test-event.dto';
import { OutboxService } from './outbox.service';

@ApiTags('outbox')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class OutboxController {
  constructor(private readonly outboxService: OutboxService) {}

  @Get('platform/outbox/metrics')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({
    summary: 'Outbox processing metrics',
    description:
      'Returns processed/failed/retry/dead-letter counters for current business.',
  })
  @ApiOkResponse({ description: 'Outbox metrics payload.' })
  getMetrics(@Req() req: { user: JwtPayload }) {
    return this.outboxService.getMetrics(Number(req.user.businessId));
  }

  @Get('platform/outbox/events')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({
    summary: 'List outbox events',
    description: 'Lists outbox events with retry/dead-letter state and payload.',
  })
  @ApiOkResponse({ description: 'Paginated outbox events.' })
  listEvents(
    @Req() req: { user: JwtPayload },
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.outboxService.listEvents(Number(req.user.businessId), {
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Post('platform/outbox/events/test')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({
    summary: 'Create test outbox event',
    description:
      'Creates a custom outbox event (for integration tests and manual verification).',
  })
  @ApiOkResponse({ description: 'Created (or deduplicated) outbox event.' })
  createTestEvent(
    @Req() req: { user: JwtPayload },
    @Body() payload: CreateOutboxTestEventDto,
  ) {
    return this.outboxService.enqueueEvent({
      businessId: Number(req.user.businessId),
      aggregateType: payload.aggregateType,
      aggregateId: payload.aggregateId,
      eventType: payload.eventType,
      idempotencyKey: payload.idempotencyKey,
      payloadJson: {
        ...(payload.payloadJson ?? {}),
        ...(payload.forceFail ? { forceFail: true } : {}),
      },
    });
  }
}
