import { Body, Controller, Get, Param, Patch, Query, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '@common/decorators';
import { JwtAuthGuard, RolesGuard } from '@common/guards';
import { JwtPayload } from '../../auth/types/jwt-payload';
import { OrdersService } from './orders.service';
import { ResolveReturnRequestDto } from './dto/resolve-return-request.dto';

@ApiTags('orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class PlatformOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get('platform/orders')
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'List orders (platform)',
    description:
      'Lists orders for the current business (platform admin). Supports source filter and pagination.',
  })
  @ApiOkResponse({
    description: 'Paginated list of orders for platform admin.',
  })
  @ApiForbiddenResponse({
    description: 'Forbidden for roles other than ADMIN.',
  })
  listPlatformOrders(
    @Req() req: { user: JwtPayload },
    @Query('source') source?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.ordersService.listPlatformOrders(req.user, {
      source: source || undefined,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Get('platform/return-requests')
  @Roles('ADMIN', 'USER')
  @ApiOperation({
    summary: 'List return requests (platform)',
    description:
      'Lists return requests for current business. Optional status filter: PENDING|APPROVED|REJECTED.',
  })
  @ApiOkResponse({ description: 'Array of return requests.' })
  listPlatformReturnRequests(
    @Req() req: { user: JwtPayload },
    @Query('status') status?: string,
  ) {
    return this.ordersService.listReturnRequests(req.user, {
      status: status || undefined,
    });
  }

  @Patch('platform/return-requests/:id/resolve')
  @Roles('ADMIN', 'USER')
  @ApiOperation({
    summary: 'Resolve return request (platform)',
    description:
      'Approves or rejects a return request. On approve, stock is restored transactionally.',
  })
  @ApiOkResponse({ description: 'Resolved return request.' })
  resolvePlatformReturnRequest(
    @Req() req: { user: JwtPayload },
    @Param('id') id: string,
    @Body() payload: ResolveReturnRequestDto,
  ) {
    return this.ordersService.resolveReturnRequest(
      req.user,
      Number(id),
      payload,
    );
  }
}

