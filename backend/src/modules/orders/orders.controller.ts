import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '@core/decorators';
import { JwtAuthGuard, RolesGuard } from '@core/guards';
import { JwtPayload } from '../../auth/types/jwt-payload';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';

@ApiTags('orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({
    summary: 'Create order',
    description:
      'Creates an order for a customer in the current business. Status is resolved via Settings (order.defaultStatusKey) and OrderStatus. Products are priced via snapshot from Product.priceCents.',
  })
  @ApiOkResponse({ description: 'The created order with items.' })
  @ApiForbiddenResponse({ description: 'Forbidden for roles other than ADMIN or STAFF.' })
  create(@Req() req: { user: JwtPayload }, @Body() payload: CreateOrderDto) {
    return this.ordersService.create(req.user, payload);
  }

  @Get()
  @Roles('ADMIN', 'STAFF', 'CUSTOMER')
  @ApiOperation({
    summary: 'List orders',
    description:
      'ADMIN lists all orders in their business. STAFF lists only orders they created. Cross-tenant access is not allowed.',
  })
  @ApiOkResponse({ description: 'Array of orders for the current business and RBAC scope.' })
  @ApiForbiddenResponse({ description: 'Forbidden for roles other than ADMIN or STAFF.' })
  findAll(@Req() req: { user: JwtPayload }) {
    return this.ordersService.findAll(req.user);
  }

  @Get(':id')
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({
    summary: 'Get order by id',
    description:
      'ADMIN can fetch any order by id in their business. STAFF can fetch only orders they created. Cross-tenant access is not allowed.',
  })
  @ApiOkResponse({ description: 'Order with items matching the given id within the current business and RBAC scope.' })
  @ApiForbiddenResponse({ description: 'STAFF trying to access an order created by another user.' })
  @ApiNotFoundResponse({ description: 'Order with the given id does not exist in the current business.' })
  findOne(@Req() req: { user: JwtPayload }, @Param('id') id: string) {
    return this.ordersService.findOne(req.user, Number(id));
  }

  @Patch(':id')
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({
    summary: 'Update order',
    description:
      'ADMIN can update any order in their business. STAFF can update only orders they created. StatusKey will be resolved to an OrderStatus in the current business.',
  })
  @ApiOkResponse({ description: 'Updated order.' })
  @ApiForbiddenResponse({ description: 'STAFF trying to update an order created by another user.' })
  @ApiNotFoundResponse({ description: 'Order with the given id or statusKey does not exist in the current business.' })
  update(
    @Req() req: { user: JwtPayload },
    @Param('id') id: string,
    @Body() payload: UpdateOrderDto,
  ) {
    return this.ordersService.update(req.user, Number(id), payload);
  }

  @Get(':id/payments')
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({
    summary: 'List payments for an order',
    description:
      'ADMIN can list payments for any order in their business. STAFF can list payments only for orders they created.',
  })
  @ApiOkResponse({ description: 'Array of payments for the given order within the current business and RBAC scope.' })
  @ApiForbiddenResponse({ description: 'STAFF trying to access payments for an order created by another user.' })
  @ApiNotFoundResponse({ description: 'Order with the given id does not exist in the current business.' })
  listPayments(@Req() req: { user: JwtPayload }, @Param('id') id: string) {
    return this.ordersService.listPayments(req.user, Number(id));
  }

  @Post(':id/payments')
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({
    summary: 'Add payment to an order',
    description:
      'ADMIN can add payments to any order in their business. STAFF can add payments only to orders they created. This endpoint does not yet enforce balance logic.',
  })
  @ApiOkResponse({ description: 'The created payment.' })
  @ApiForbiddenResponse({ description: 'STAFF trying to add a payment to an order created by another user.' })
  @ApiNotFoundResponse({ description: 'Order with the given id does not exist in the current business.' })
  addPayment(
    @Req() req: { user: JwtPayload },
    @Param('id') id: string,
    @Body() payload: CreatePaymentDto,
  ) {
    return this.ordersService.addPayment(req.user, Number(id), payload);
  }
}
