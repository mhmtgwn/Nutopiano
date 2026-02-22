import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '@common/decorators';
import { JwtAuthGuard, RolesGuard } from '@common/guards';
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
  @Roles('CUSTOMER', 'ADMIN', 'STAFF')
  @ApiOperation({
    summary: 'Create order',
    description:
      'Creates an order for a customer in the current business. Status is resolved via Settings (order.defaultStatusKey) and OrderStatus. Products are priced via snapshot from Product.priceCents. Optional Idempotency-Key header prevents duplicate order creation on retries.',
  })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: false,
    description:
      'Optional unique key to make order creation idempotent. Reusing the same key with the same payload returns the same order.',
  })
  @ApiOkResponse({ description: 'The created order with items.' })
  @ApiForbiddenResponse({
    description: 'Forbidden for roles other than CUSTOMER, ADMIN or STAFF.',
  })
  create(
    @Req() req: { user: JwtPayload },
    @Body() payload: CreateOrderDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.ordersService.create(req.user, payload, idempotencyKey);
  }

  @Get()
  @Roles('ADMIN', 'SELLER', 'STAFF', 'CUSTOMER')
  @ApiOperation({
    summary: 'List orders',
    description:
      'ADMIN/SELLER lists all orders in their business. STAFF lists only orders they created. Cross-tenant access is not allowed.',
  })
  @ApiOkResponse({
    description: 'Array of orders for the current business and RBAC scope.',
  })
  @ApiForbiddenResponse({
    description: 'Forbidden for roles other than ADMIN, SELLER, STAFF or CUSTOMER.',
  })
  findAll(
    @Req() req: { user: JwtPayload },
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const hasPagination = Boolean(page) || Boolean(pageSize);

    if (hasPagination) {
      return this.ordersService.findAllPaginated(req.user, {
        page: page ? Number(page) : undefined,
        pageSize: pageSize ? Number(pageSize) : undefined,
      });
    }

    return this.ordersService.findAll(req.user);
  }

  @Get(':id')
  @Roles('ADMIN', 'SELLER', 'STAFF', 'CUSTOMER')
  @ApiOperation({
    summary: 'Get order by id',
    description:
      'ADMIN/SELLER can fetch any order by id in their business. STAFF can fetch only orders they created. CUSTOMER can fetch only their own orders. Cross-tenant access is not allowed.',
  })
  @ApiOkResponse({
    description:
      'Order with items matching the given id within the current business and RBAC scope.',
  })
  @ApiForbiddenResponse({
    description:
      'STAFF trying to access an order created by another user, or CUSTOMER trying to access another customer\'s order.',
  })
  @ApiNotFoundResponse({
    description:
      'Order with the given id does not exist in the current business.',
  })
  findOne(@Req() req: { user: JwtPayload }, @Param('id') id: string) {
    return this.ordersService.findOne(req.user, Number(id));
  }

  @Patch(':id')
  @Roles('ADMIN', 'SELLER', 'STAFF')
  @ApiOperation({
    summary: 'Update order',
    description:
      'ADMIN/SELLER can update any order in their business. STAFF can update only orders they created. StatusKey will be resolved to an OrderStatus in the current business.',
  })
  @ApiOkResponse({ description: 'Updated order.' })
  @ApiForbiddenResponse({
    description: 'STAFF trying to update an order created by another user.',
  })
  @ApiNotFoundResponse({
    description:
      'Order with the given id or statusKey does not exist in the current business.',
  })
  update(
    @Req() req: { user: JwtPayload },
    @Param('id') id: string,
    @Body() payload: UpdateOrderDto,
  ) {
    return this.ordersService.update(req.user, Number(id), payload);
  }

  @Get(':id/payments')
  @Roles('ADMIN', 'SELLER', 'STAFF', 'CUSTOMER')
  @ApiOperation({
    summary: 'List payments for an order',
    description:
      'ADMIN/SELLER can list payments for any order in their business. STAFF can list payments only for orders they created. CUSTOMER can list payments only for their own orders.',
  })
  @ApiOkResponse({
    description:
      'Array of payments for the given order within the current business and RBAC scope.',
  })
  @ApiForbiddenResponse({
    description:
      'STAFF trying to access payments for an order created by another user, or CUSTOMER trying to access another customer\'s order payments.',
  })
  @ApiNotFoundResponse({
    description:
      'Order with the given id does not exist in the current business.',
  })
  listPayments(@Req() req: { user: JwtPayload }, @Param('id') id: string) {
    return this.ordersService.listPayments(req.user, Number(id));
  }

  @Post(':id/payments')
  @Roles('ADMIN', 'SELLER', 'STAFF')
  @ApiOperation({
    summary: 'Add payment to an order',
    description:
      'ADMIN/SELLER can add payments to any order in their business. STAFF can add payments only to orders they created. This endpoint does not yet enforce balance logic.',
  })
  @ApiOkResponse({ description: 'The created payment.' })
  @ApiForbiddenResponse({
    description:
      'STAFF trying to add a payment to an order created by another user.',
  })
  @ApiNotFoundResponse({
    description:
      'Order with the given id does not exist in the current business.',
  })
  addPayment(
    @Req() req: { user: JwtPayload },
    @Param('id') id: string,
    @Body() payload: CreatePaymentDto,
  ) {
    return this.ordersService.addPayment(req.user, Number(id), payload);
  }
}
