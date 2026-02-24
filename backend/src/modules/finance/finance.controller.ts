import {
  Body,
  Controller,
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
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '@common/decorators';
import { JwtAuthGuard, RolesGuard } from '@common/guards';
import { JwtPayload } from '../../auth/types/jwt-payload';
import { FinanceService } from './finance.service';
import { PayoutRequestDto } from './dto/payout-request.dto';

@ApiTags('finance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Get('seller/finance/payouts')
  @Roles('SELLER')
  @ApiOperation({
    summary: 'List payout requests for current seller',
    description:
      'Lists payout requests created by the authenticated seller/staff user.',
  })
  @ApiOkResponse({
    description: 'Paginated list of payout requests for the seller.',
  })
  listSellerPayouts(
    @Req() req: { user: JwtPayload },
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.financeService.listSellerPayouts(req.user, {
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Get('platform/finance/payouts')
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'List payout requests (platform)',
    description:
      'Lists payout requests for the current business. Supports status filter and pagination.',
  })
  @ApiOkResponse({
    description: 'Paginated list of payout requests for platform admin.',
  })
  listPlatformPayouts(
    @Req() req: { user: JwtPayload },
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.financeService.listPlatformPayouts(req.user, {
      status: status || undefined,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Post('seller/finance/payout-request')
  @Roles('SELLER')
  @ApiOperation({
    summary: 'Request a payout',
    description:
      'Creates a payout request for the authenticated seller/staff user. Workflow: pending -> approved -> completed (manual EFT).',
  })
  @ApiOkResponse({ description: 'Created payout request.' })
  @ApiForbiddenResponse({
    description: 'Forbidden for roles other than USER.',
  })
  requestPayout(
    @Req() req: { user: JwtPayload },
    @Body() payload: PayoutRequestDto,
  ) {
    return this.financeService.requestPayout(req.user, payload.amountCents);
  }

  @Patch('platform/finance/payouts/:id/approve')
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Approve a payout request',
    description: 'Marks a pending payout request as approved.',
  })
  @ApiOkResponse({ description: 'Approved payout request.' })
  approvePayout(@Req() req: { user: JwtPayload }, @Param('id') id: string) {
    return this.financeService.approvePayout(req.user, Number(id));
  }

  @Patch('platform/finance/payouts/:id/complete')
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Complete a payout request',
    description:
      'Marks an approved payout request as completed after manual EFT.',
  })
  @ApiOkResponse({ description: 'Completed payout request.' })
  completePayout(@Req() req: { user: JwtPayload }, @Param('id') id: string) {
    return this.financeService.completePayout(req.user, Number(id));
  }

  @Get('seller/finance/overview')
  @Roles('SELLER', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({
    summary: 'Seller finance overview',
    description:
      'Returns revenue/profit/collection/credit KPI summary scoped by seller access and date range.',
  })
  @ApiOkResponse({ description: 'Seller finance overview payload.' })
  getSellerFinanceOverview(
    @Req() req: { user: JwtPayload },
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('sellerId') sellerId?: string,
  ) {
    return this.financeService.getSellerFinanceOverview(req.user, {
      dateFrom,
      dateTo,
      sellerId: sellerId ? Number(sellerId) : undefined,
    });
  }

  @Get('seller/finance/reports/users')
  @Roles('SELLER', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({
    summary: 'User-based seller sales report',
    description:
      'Returns order/revenue/profit totals grouped by user for the selected date range.',
  })
  @ApiOkResponse({ description: 'Grouped user sales report payload.' })
  getSellerUserSalesReport(
    @Req() req: { user: JwtPayload },
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('sellerId') sellerId?: string,
  ) {
    return this.financeService.getSellerUserSalesReport(req.user, {
      dateFrom,
      dateTo,
      sellerId: sellerId ? Number(sellerId) : undefined,
    });
  }

  @Get('seller/finance/reports/products')
  @Roles('SELLER', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({
    summary: 'Product-based seller profit report',
    description:
      'Returns quantity/sales/cost/profit grouped by product for the selected date range.',
  })
  @ApiOkResponse({ description: 'Grouped product profit report payload.' })
  getSellerProductProfitReport(
    @Req() req: { user: JwtPayload },
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('sellerId') sellerId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.financeService.getSellerProductProfitReport(req.user, {
      dateFrom,
      dateTo,
      sellerId: sellerId ? Number(sellerId) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }
}

