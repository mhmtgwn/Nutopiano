import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
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
}
