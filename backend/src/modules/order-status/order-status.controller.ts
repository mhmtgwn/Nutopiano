import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '@core/decorators';
import { JwtAuthGuard, RolesGuard } from '@core/guards';
import { JwtPayload } from '../../auth/types/jwt-payload';
import { CreateOrderStatusDto } from './dto/create-order-status.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrderStatusService } from './order-status.service';

@ApiTags('order-status')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('order-status')
export class OrderStatusController {
  constructor(private readonly orderStatusService: OrderStatusService) {}

  @Post()
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Create order status',
    description:
      'ADMIN can create order statuses for their business. Only one default status is allowed per business. If isDefault is true, the previous default will be cleared.',
  })
  @ApiOkResponse({ description: 'The created order status.' })
  @ApiForbiddenResponse({ description: 'Forbidden for roles other than ADMIN.' })
  create(@Req() req: { user: JwtPayload }, @Body() payload: CreateOrderStatusDto) {
    return this.orderStatusService.create(req.user, payload);
  }

  @Get()
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({
    summary: 'List order statuses',
    description:
      'ADMIN and STAFF can list all order statuses for their business. The flow is config-driven per business and ordered by orderIndex.',
  })
  @ApiOkResponse({ description: 'Array of order statuses for the current business.' })
  @ApiForbiddenResponse({ description: 'Forbidden for roles other than ADMIN or STAFF.' })
  findAll(@Req() req: { user: JwtPayload }) {
    return this.orderStatusService.findAll(req.user);
  }

  @Get(':id')
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({
    summary: 'Get order status by id',
    description:
      'ADMIN and STAFF can fetch any order status by id within their business. Cross-tenant access is not allowed.',
  })
  @ApiOkResponse({ description: 'Order status matching the given id in the current business.' })
  @ApiNotFoundResponse({ description: 'Order status with the given id does not exist in the current business.' })
  findOne(@Req() req: { user: JwtPayload }, @Param('id') id: string) {
    return this.orderStatusService.findOne(req.user, Number(id));
  }

  @Patch(':id')
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Update order status',
    description:
      'ADMIN can update order statuses for their business. Setting isDefault=true will clear the previous default within the same business.',
  })
  @ApiOkResponse({ description: 'Updated order status.' })
  @ApiForbiddenResponse({ description: 'Forbidden for roles other than ADMIN.' })
  @ApiNotFoundResponse({ description: 'Order status with the given id does not exist in the current business.' })
  update(
    @Req() req: { user: JwtPayload },
    @Param('id') id: string,
    @Body() payload: UpdateOrderStatusDto,
  ) {
    return this.orderStatusService.update(req.user, Number(id), payload);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Delete order status',
    description:
      'ADMIN can delete order statuses for their business. Cross-tenant access is not allowed.',
  })
  @ApiOkResponse({ description: 'Deleted order status.' })
  @ApiForbiddenResponse({ description: 'Forbidden for roles other than ADMIN.' })
  @ApiNotFoundResponse({ description: 'Order status with the given id does not exist in the current business.' })
  remove(@Req() req: { user: JwtPayload }, @Param('id') id: string) {
    return this.orderStatusService.remove(req.user, Number(id));
  }
}
