import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '@common/decorators';
import { JwtAuthGuard, RolesGuard } from '@common/guards';
import { JwtPayload } from '../../auth/types/jwt-payload';
import { CustomersService } from './customers.service';
import { OrdersService } from '../orders/orders.service';
import { CreateCustomerAddressDto } from './dto/create-customer-address.dto';
import { UpdateCustomerAddressDto } from './dto/update-customer-address.dto';
import { SetDefaultAddressDto } from './dto/set-default-address.dto';
import { AddCustomerFavoriteDto } from './dto/add-customer-favorite.dto';
import { UpsertProductReviewDto } from './dto/upsert-product-review.dto';
import { UpdateCustomerPreferencesDto } from './dto/update-customer-preferences.dto';
import { CreateReturnRequestDto } from '../orders/dto/create-return-request.dto';

@ApiTags('customer-portal')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('customer')
export class CustomerPortalController {
  constructor(
    private readonly customersService: CustomersService,
    private readonly ordersService: OrdersService,
  ) {}

  @Get('profile')
  @Roles('CUSTOMER')
  @ApiOperation({
    summary: 'Get customer portal profile',
    description:
      'Returns the authenticated user profile along with their linked customer record (created automatically if missing).',
  })
  @ApiOkResponse({ description: 'Customer portal profile payload.' })
  async profile(@Req() req: { user: JwtPayload }) {
    return this.customersService.getCustomerPortalProfile(req.user);
  }

  @Get('orders')
  @Roles('CUSTOMER')
  @ApiOperation({
    summary: 'List customer orders',
    description:
      'Lists orders belonging to the authenticated customer in the current business.',
  })
  @ApiOkResponse({ description: 'Array of customer orders.' })
  async listOrders(
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

  @Get('orders/:id')
  @Roles('CUSTOMER')
  @ApiOperation({
    summary: 'Get customer order detail',
    description:
      'Returns an order detail only if it belongs to the authenticated customer.',
  })
  @ApiOkResponse({ description: 'Customer order detail payload.' })
  async getOrder(@Req() req: { user: JwtPayload }, @Param('id') id: string) {
    return this.ordersService.findOneCustomer(req.user, Number(id));
  }

  @Post('orders/:id/cancel')
  @Roles('CUSTOMER')
  @ApiOperation({
    summary: 'Request order cancellation',
    description:
      'Sets order status to CANCELLED if allowed and the order belongs to the authenticated customer.',
  })
  @ApiOkResponse({ description: 'Updated customer order detail payload.' })
  async cancelOrder(@Req() req: { user: JwtPayload }, @Param('id') id: string) {
    return this.ordersService.requestCancelCustomerOrder(req.user, Number(id));
  }

  @Post('orders/:id/return')
  @Roles('CUSTOMER')
  @ApiOperation({
    summary: 'Request order return',
    description:
      'Creates a return request and sets order status to RETURN_REQUESTED if allowed.',
  })
  @ApiOkResponse({ description: 'Updated customer order detail payload.' })
  async returnOrder(
    @Req() req: { user: JwtPayload },
    @Param('id') id: string,
    @Body() payload: CreateReturnRequestDto,
  ) {
    return this.ordersService.requestReturnCustomerOrder(
      req.user,
      Number(id),
      payload?.reason,
    );
  }

  @Get('addresses')
  @Roles('CUSTOMER')
  @ApiOperation({
    summary: 'List customer addresses',
    description:
      'Lists address book entries belonging to the authenticated customer.',
  })
  @ApiOkResponse({ description: 'Array of customer addresses.' })
  async listAddresses(@Req() req: { user: JwtPayload }) {
    return this.customersService.listCustomerAddresses(req.user);
  }

  @Post('addresses')
  @Roles('CUSTOMER')
  @ApiOperation({
    summary: 'Create customer address',
    description:
      'Creates a new address book entry for the authenticated customer.',
  })
  @ApiOkResponse({ description: 'Created address.' })
  async createAddress(
    @Req() req: { user: JwtPayload },
    @Body() payload: CreateCustomerAddressDto,
  ) {
    return this.customersService.createCustomerAddress(req.user, payload);
  }

  @Patch('addresses/:id')
  @Roles('CUSTOMER')
  @ApiOperation({
    summary: 'Update customer address',
    description:
      'Updates an address book entry belonging to the authenticated customer.',
  })
  @ApiOkResponse({ description: 'Updated address.' })
  async updateAddress(
    @Req() req: { user: JwtPayload },
    @Param('id') id: string,
    @Body() payload: UpdateCustomerAddressDto,
  ) {
    return this.customersService.updateCustomerAddress(
      req.user,
      Number(id),
      payload,
    );
  }

  @Delete('addresses/:id')
  @Roles('CUSTOMER')
  @ApiOperation({
    summary: 'Delete customer address',
    description:
      'Deletes an address book entry belonging to the authenticated customer.',
  })
  @ApiOkResponse({ description: 'Deleted address id.' })
  async deleteAddress(
    @Req() req: { user: JwtPayload },
    @Param('id') id: string,
  ) {
    return this.customersService.deleteCustomerAddress(req.user, Number(id));
  }

  @Patch('addresses/:id/default')
  @Roles('CUSTOMER')
  @ApiOperation({
    summary: 'Set default customer address',
    description:
      'Sets an address as default shipping or billing for the authenticated customer.',
  })
  @ApiOkResponse({ description: 'Updated address.' })
  async setDefaultAddress(
    @Req() req: { user: JwtPayload },
    @Param('id') id: string,
    @Body() payload: SetDefaultAddressDto,
  ) {
    return this.customersService.setDefaultCustomerAddress(
      req.user,
      Number(id),
      payload.type,
    );
  }

  @Get('favorites')
  @Roles('CUSTOMER')
  @ApiOperation({
    summary: 'List customer favorites',
    description: 'Lists favorite products of the authenticated customer.',
  })
  @ApiOkResponse({ description: 'Array of customer favorite products.' })
  async listFavorites(@Req() req: { user: JwtPayload }) {
    return this.customersService.listCustomerFavorites(req.user);
  }

  @Post('favorites')
  @Roles('CUSTOMER')
  @ApiOperation({
    summary: 'Add customer favorite',
    description: 'Adds a product to the authenticated customer favorites list.',
  })
  @ApiOkResponse({ description: 'Added product id.' })
  async addFavorite(
    @Req() req: { user: JwtPayload },
    @Body() payload: AddCustomerFavoriteDto,
  ) {
    return this.customersService.addCustomerFavorite(
      req.user,
      payload.productId,
    );
  }

  @Delete('favorites/:productId')
  @Roles('CUSTOMER')
  @ApiOperation({
    summary: 'Remove customer favorite',
    description:
      'Removes a product from the authenticated customer favorites list.',
  })
  @ApiOkResponse({ description: 'Removed product id.' })
  async removeFavorite(
    @Req() req: { user: JwtPayload },
    @Param('productId') productId: string,
  ) {
    return this.customersService.removeCustomerFavorite(
      req.user,
      Number(productId),
    );
  }

  @Get('reviews')
  @Roles('CUSTOMER')
  @ApiOperation({
    summary: 'List customer reviews',
    description: 'Lists product reviews created by the authenticated customer.',
  })
  @ApiOkResponse({ description: 'Array of customer reviews.' })
  async listReviews(@Req() req: { user: JwtPayload }) {
    return this.customersService.listCustomerReviews(req.user);
  }

  @Post('reviews')
  @Roles('CUSTOMER')
  @ApiOperation({
    summary: 'Create or update product review',
    description:
      'Upserts a product review for the authenticated customer (one review per product).',
  })
  @ApiOkResponse({ description: 'Upserted review.' })
  async upsertReview(
    @Req() req: { user: JwtPayload },
    @Body() payload: UpsertProductReviewDto,
  ) {
    return this.customersService.upsertCustomerReview(req.user, payload);
  }

  @Get('preferences')
  @Roles('CUSTOMER')
  @ApiOperation({
    summary: 'Get customer preferences',
    description:
      'Returns persisted notification/consent preferences for the authenticated customer.',
  })
  @ApiOkResponse({ description: 'Customer preferences payload.' })
  async getPreferences(@Req() req: { user: JwtPayload }) {
    return this.customersService.getCustomerPreferences(req.user);
  }

  @Patch('preferences')
  @Roles('CUSTOMER')
  @ApiOperation({
    summary: 'Update customer preferences',
    description:
      'Updates notification/consent preferences for the authenticated customer.',
  })
  @ApiOkResponse({ description: 'Updated customer preferences payload.' })
  async updatePreferences(
    @Req() req: { user: JwtPayload },
    @Body() payload: UpdateCustomerPreferencesDto,
  ) {
    return this.customersService.updateCustomerPreferences(req.user, payload);
  }
}
