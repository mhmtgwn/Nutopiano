import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { InviteDeliveryStatus, SellerInviteStatus } from '@prisma/client';
import { Roles } from '@common/decorators';
import { JwtAuthGuard, RolesGuard } from '@common/guards';
import { JwtPayload } from '../../auth/types/jwt-payload';
import { CreateProductDto } from '../products/dto/create-product.dto';
import { UpdateProductDto } from '../products/dto/update-product.dto';
import { AdminProductPublishForceDto } from './dto/admin-product-publish-force.dto';
import { AdminProductStockForceDto } from './dto/admin-product-stock-force.dto';
import { CreateSellerApplicationDto } from './dto/create-seller-application.dto';
import { CreateSellerPosUserDto } from './dto/create-seller-pos-user.dto';
import { CreateSellerTeamInviteDto } from './dto/create-seller-team-invite.dto';
import { SellerProductPublishDto } from './dto/seller-product-publish.dto';
import { SellerProductStockDto } from './dto/seller-product-stock.dto';
import { UpdateSellerPosUserDto } from './dto/update-seller-pos-user.dto';
import { UpdateSellerCustomerCreditDto } from './dto/update-seller-customer-credit.dto';
import { UpdateSellerTeamMemberDto } from './dto/update-seller-team-member.dto';
import { SellersService } from './sellers.service';

@ApiTags('sellers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class SellersController {
  constructor(private readonly sellersService: SellersService) { }

  @Post('sellers/applications')
  @Roles('CUSTOMER', 'USER')
  @ApiOperation({
    summary: 'Create seller onboarding application',
    description:
      'CUSTOMER/USER can create or refresh their seller onboarding application. Application starts as pending (isActive=false).',
  })
  createSellerApplication(
    @Req() req: { user: JwtPayload },
    @Body() payload: CreateSellerApplicationDto,
  ) {
    return this.sellersService.createSellerApplication(req.user, payload);
  }

  @Get('sellers/applications/me')
  @Roles('CUSTOMER', 'USER', 'SELLER')
  @ApiOperation({
    summary: 'Get my seller application',
    description:
      'Returns current user seller application (pending/approved) for the active business.',
  })
  getMySellerApplication(@Req() req: { user: JwtPayload }) {
    return this.sellersService.getMySellerApplication(req.user);
  }

  @Post('seller/team/invites')
  @Roles('SELLER')
  @ApiOperation({
    summary: 'Create seller team invite',
    description:
      'SELLER can invite an existing customer/user into their seller team.',
  })
  createSellerTeamInvite(
    @Req() req: { user: JwtPayload },
    @Body() payload: CreateSellerTeamInviteDto,
  ) {
    return this.sellersService.createSellerTeamInvite(req.user, payload);
  }

  @Get('seller/team/invites')
  @Roles('SELLER', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({
    summary: 'List seller team invites with delivery status',
    description:
      'Lists invites and delivery rows (channel/status/retry/dead-letter) for seller scope.',
  })
  listSellerTeamInvites(
    @Req() req: { user: JwtPayload },
    @Query('sellerId') sellerId?: string,
    @Query('inviteStatus') inviteStatus?: string,
    @Query('deliveryStatus') deliveryStatus?: string,
  ) {
    return this.sellersService.listSellerTeamInvites(req.user, {
      sellerId: sellerId ? Number(sellerId) : undefined,
      inviteStatus: inviteStatus
        ? (inviteStatus as SellerInviteStatus)
        : undefined,
      deliveryStatus: deliveryStatus
        ? (deliveryStatus as InviteDeliveryStatus)
        : undefined,
    });
  }

  @Post('seller/team/invites/:id/accept')
  @Roles('CUSTOMER', 'USER')
  @ApiOperation({
    summary: 'Accept seller team invite',
    description:
      'Invited user accepts a pending seller team invite. User role becomes USER.',
  })
  acceptSellerTeamInvite(
    @Req() req: { user: JwtPayload },
    @Param('id') id: string,
  ) {
    return this.sellersService.acceptSellerTeamInvite(req.user, Number(id));
  }

  @Get('seller/team/members')
  @Roles('SELLER')
  @ApiOperation({
    summary: 'List seller team members',
    description: 'Lists team members for current seller profile.',
  })
  listSellerTeamMembers(@Req() req: { user: JwtPayload }) {
    return this.sellersService.listSellerTeamMembers(req.user);
  }

  @Patch('seller/team/members/:id')
  @Roles('SELLER')
  @ApiOperation({
    summary: 'Update seller team member',
    description:
      'SELLER can toggle member active state and permissions payload.',
  })
  updateSellerTeamMember(
    @Req() req: { user: JwtPayload },
    @Param('id') id: string,
    @Body() payload: UpdateSellerTeamMemberDto,
  ) {
    return this.sellersService.updateSellerTeamMember(
      req.user,
      Number(id),
      payload,
    );
  }

  @Get('sellers/:sellerId/pos-users')
  @Roles('SELLER', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({
    summary: 'List POS users for a seller',
    description:
      'SELLER can list own store POS users. ADMIN can list any seller in same business.',
  })
  listSellerPosUsers(
    @Req() req: { user: JwtPayload },
    @Param('sellerId') sellerId: string,
  ) {
    return this.sellersService.listSellerPosUsers(req.user, Number(sellerId));
  }

  @Post('sellers/:sellerId/pos-users')
  @Roles('SELLER', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({
    summary: 'Create or activate seller POS user',
  })
  createSellerPosUser(
    @Req() req: { user: JwtPayload },
    @Param('sellerId') sellerId: string,
    @Body() payload: CreateSellerPosUserDto,
  ) {
    return this.sellersService.createSellerPosUser(
      req.user,
      Number(sellerId),
      payload,
    );
  }

  @Patch('sellers/:sellerId/pos-users/:memberId')
  @Roles('SELLER', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({
    summary: 'Update seller POS user',
  })
  updateSellerPosUser(
    @Req() req: { user: JwtPayload },
    @Param('sellerId') sellerId: string,
    @Param('memberId') memberId: string,
    @Body() payload: UpdateSellerPosUserDto,
  ) {
    return this.sellersService.updateSellerPosUser(
      req.user,
      Number(sellerId),
      Number(memberId),
      payload,
    );
  }

  @Delete('sellers/:sellerId/pos-users/:memberId')
  @Roles('SELLER', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({
    summary: 'Delete seller POS user',
  })
  deleteSellerPosUser(
    @Req() req: { user: JwtPayload },
    @Param('sellerId') sellerId: string,
    @Param('memberId') memberId: string,
  ) {
    return this.sellersService.deleteSellerPosUser(
      req.user,
      Number(sellerId),
      Number(memberId),
    );
  }

  @Post('seller/products')
  @Roles('SELLER')
  @ApiOperation({
    summary: 'Create seller-owned product',
    description: 'Creates a product owned by current seller.',
  })
  createSellerProduct(
    @Req() req: { user: JwtPayload },
    @Body() payload: CreateProductDto,
  ) {
    return this.sellersService.createSellerProduct(req.user, payload);
  }

  @Patch('seller/products/:id')
  @Roles('SELLER')
  @ApiOperation({
    summary: 'Update seller-owned product',
    description: 'Updates a product owned by current seller.',
  })
  updateSellerProduct(
    @Req() req: { user: JwtPayload },
    @Param('id') id: string,
    @Body() payload: UpdateProductDto,
  ) {
    return this.sellersService.updateSellerProduct(req.user, Number(id), payload);
  }

  @Patch('seller/products/:id/publish')
  @Roles('SELLER')
  @ApiOperation({
    summary: 'Publish/unpublish seller product',
    description:
      'Publishes product to e-commerce storefront. Stock must be greater than zero.',
  })
  updateSellerProductPublish(
    @Req() req: { user: JwtPayload },
    @Param('id') id: string,
    @Body() payload: SellerProductPublishDto,
  ) {
    return this.sellersService.updateSellerProductPublish(
      req.user,
      Number(id),
      payload.isPublished,
    );
  }

  @Patch('seller/products/:id/stock')
  @Roles('SELLER')
  @ApiOperation({
    summary: 'Update seller product stock',
    description:
      'Updates stock level. If stock becomes 0, product is auto-unpublished.',
  })
  updateSellerProductStock(
    @Req() req: { user: JwtPayload },
    @Param('id') id: string,
    @Body() payload: SellerProductStockDto,
  ) {
    return this.sellersService.updateSellerProductStock(
      req.user,
      Number(id),
      payload.stock,
    );
  }

  @Patch('platform/sellers/:sellerId/products/:id/publish-force')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({
    summary: 'Override publish status for seller product',
    description:
      'Controlled override for publish-force. reason zorunludur ve audit log yazilir.',
  })
  overridePlatformSellerProductPublish(
    @Req() req: { user: JwtPayload },
    @Param('sellerId') sellerId: string,
    @Param('id') id: string,
    @Body() payload: AdminProductPublishForceDto,
  ) {
    return this.sellersService.overridePlatformSellerProductPublish(
      req.user,
      Number(sellerId),
      Number(id),
      payload,
    );
  }

  @Patch('platform/sellers/:sellerId/products/:id/stock-force')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({
    summary: 'Override stock for seller product',
    description:
      'Controlled override for stock-adjust-force. reason zorunludur ve audit log yazilir.',
  })
  overridePlatformSellerProductStock(
    @Req() req: { user: JwtPayload },
    @Param('sellerId') sellerId: string,
    @Param('id') id: string,
    @Body() payload: AdminProductStockForceDto,
  ) {
    return this.sellersService.overridePlatformSellerProductStock(
      req.user,
      Number(sellerId),
      Number(id),
      payload,
    );
  }

  @Get('seller/customers')
  @Roles('SELLER', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({
    summary: 'List seller-scope customers',
    description:
      'Lists customers related to seller scope using order + ledger relations.',
  })
  listSellerCustomers(
    @Req() req: { user: JwtPayload },
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('sellerId') sellerId?: string,
  ) {
    return this.sellersService.listSellerCustomers(req.user, {
      q,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      sellerId: sellerId ? Number(sellerId) : undefined,
    });
  }

  @Get('seller/customers/:id/ledger')
  @Roles('SELLER', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({
    summary: 'Get customer ledger by seller scope',
    description:
      'Returns credit/debit ledger entries for a customer within allowed seller scope.',
  })
  getSellerCustomerLedger(
    @Req() req: { user: JwtPayload },
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('sellerId') sellerId?: string,
  ) {
    return this.sellersService.getSellerCustomerLedger(req.user, Number(id), {
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      sellerId: sellerId ? Number(sellerId) : undefined,
    });
  }

  @Patch('seller/customers/:id/credit-policy')
  @Roles('SELLER', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({
    summary: 'Update customer credit policy',
    description:
      'Updates credit limit and block policy for a customer in seller scope.',
  })
  updateSellerCustomerCreditPolicy(
    @Req() req: { user: JwtPayload },
    @Param('id') id: string,
    @Body() payload: UpdateSellerCustomerCreditDto,
  ) {
    return this.sellersService.updateSellerCustomerCreditPolicy(
      req.user,
      Number(id),
      payload,
    );
  }

  @Get('platform/sellers/applications')
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'List seller applications (platform)',
    description:
      'Lists seller applications for the current business. For Faz 1 this endpoint returns sellers that are inactive (isActive=false) as pending applications.',
  })
  @ApiOkResponse({ description: 'Paginated list of seller applications.' })
  @ApiForbiddenResponse({
    description: 'Forbidden for roles other than ADMIN.',
  })
  listPlatformSellerApplications(
    @Req() req: { user: JwtPayload },
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.sellersService.listPlatformSellerApplications(req.user, {
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Get('platform/sellers/:id')
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Get seller detail (platform)',
    description: 'Fetches seller profile details for the current business.',
  })
  @ApiOkResponse({ description: 'Seller detail payload.' })
  @ApiForbiddenResponse({
    description: 'Forbidden for roles other than ADMIN.',
  })
  getPlatformSellerDetail(
    @Req() req: { user: JwtPayload },
    @Param('id') id: string,
  ) {
    return this.sellersService.getPlatformSellerDetail(req.user, Number(id));
  }

  @Patch('platform/sellers/:id/active')
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Set seller active (platform)',
    description:
      'Approves (isActive=true) or rejects/suspends (isActive=false) a seller profile for the current business.',
  })
  @ApiOkResponse({ description: 'Updated seller active state.' })
  @ApiForbiddenResponse({
    description: 'Forbidden for roles other than ADMIN.',
  })
  setPlatformSellerActive(
    @Req() req: { user: JwtPayload },
    @Param('id') id: string,
    @Body() payload: { isActive: boolean },
  ) {
    return this.sellersService.setPlatformSellerActive(
      req.user,
      Number(id),
      Boolean(payload?.isActive),
    );
  }

  @Get('platform/sellers')
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'List sellers (platform)',
    description:
      'Lists sellers for the current business. Supports active filter and pagination.',
  })
  @ApiOkResponse({ description: 'Paginated list of sellers.' })
  @ApiForbiddenResponse({
    description: 'Forbidden for roles other than ADMIN.',
  })
  listPlatformSellers(
    @Req() req: { user: JwtPayload },
    @Query('isActive') isActive?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const isActiveBool =
      typeof isActive === 'string'
        ? isActive === 'true' || isActive === '1'
          ? true
          : isActive === 'false' || isActive === '0'
            ? false
            : undefined
        : undefined;

    return this.sellersService.listPlatformSellers(req.user, {
      isActive: isActiveBool,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Get('platform/sellers/staff')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({
    summary: 'List all seller staff (platform)',
    description:
      'Lists all seller team members across all sellers in the business.',
  })
  @ApiOkResponse({ description: 'Paginated list of seller staff.' })
  listAllStaffForAdmin(
    @Req() req: { user: JwtPayload },
    @Query('sellerId') sellerId?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.sellersService.listAllStaffForAdmin(req.user, {
      sellerId: sellerId ? Number(sellerId) : undefined,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }
}
