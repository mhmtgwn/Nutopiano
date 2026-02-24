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

  @Get('seller/finance/payoutability')
  @Roles('SELLER')
  @ApiOperation({
    summary: 'Get seller payoutability',
    description:
      'Returns pending/available balances and currently requestable payout amount for the current seller.',
  })
  @ApiOkResponse({ description: 'Seller payoutability payload.' })
  getSellerPayoutability(@Req() req: { user: JwtPayload }) {
    return this.financeService.getSellerPayoutability(req.user);
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
    summary: 'Mark payout as paid',
    description:
      'Marks an approved payout request as paid after manual bank transfer and posts immutable ledger entries.',
  })
  @ApiOkResponse({ description: 'Paid payout request.' })
  completePayout(@Req() req: { user: JwtPayload }, @Param('id') id: string) {
    return this.financeService.completePayout(req.user, Number(id));
  }

  @Patch('platform/finance/payouts/:id/reject')
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Reject payout request',
    description:
      'Rejects a REQUESTED/APPROVED payout request without posting paid ledger entries.',
  })
  @ApiOkResponse({ description: 'Rejected payout request.' })
  rejectPayout(@Req() req: { user: JwtPayload }, @Param('id') id: string) {
    return this.financeService.rejectPayout(req.user, Number(id));
  }

  @Post('platform/finance/payouts/release-pending')
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Run pending->available release job',
    description:
      'Runs T+7 release policy for completed orders and moves pending balances to available balances.',
  })
  @ApiOkResponse({ description: 'Release job summary.' })
  releasePendingToAvailable(
    @Req() req: { user: JwtPayload },
    @Query('limit') limit?: string,
  ) {
    return this.financeService.releasePendingToAvailable(req.user, {
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('platform/finance/health')
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Finance health snapshot',
    description:
      'Returns ledger invariant, wallet negativity, mismatch rate and reconciliation health metrics.',
  })
  @ApiOkResponse({ description: 'Finance health payload.' })
  getFinanceHealth(
    @Req() req: { user: JwtPayload },
    @Query('payoutAgingDays') payoutAgingDays?: string,
  ) {
    return this.financeService.getFinanceHealth(req.user, {
      payoutAgingDays: payoutAgingDays ? Number(payoutAgingDays) : undefined,
    });
  }

  @Get('platform/risk/price-mismatches')
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'List price mismatch orders',
    description:
      'Returns flagged POS/commerce orders that were accepted with price mismatch policy.',
  })
  @ApiOkResponse({ description: 'Paginated price mismatch list.' })
  listPriceMismatches(
    @Req() req: { user: JwtPayload },
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.financeService.listPriceMismatches(req.user, {
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Get('platform/finance/ledger')
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'List finance ledger entries',
    description:
      'Returns paginated immutable ledger entries with optional seller/date/type/channel/order filters.',
  })
  @ApiOkResponse({ description: 'Paginated ledger entries.' })
  listFinanceLedger(
    @Req() req: { user: JwtPayload },
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('sellerId') sellerId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('type') type?: string,
    @Query('channel') channel?: string,
    @Query('orderId') orderId?: string,
  ) {
    return this.financeService.listFinanceLedger(req.user, {
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      sellerId: sellerId ? Number(sellerId) : undefined,
      dateFrom,
      dateTo,
      type,
      channel,
      orderId: orderId ? Number(orderId) : undefined,
    });
  }

  @Get('platform/finance/wallets')
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'List seller wallets',
    description:
      'Returns paginated seller wallet balances with derived earned/paid totals.',
  })
  @ApiOkResponse({ description: 'Paginated seller wallets.' })
  listSellerWallets(
    @Req() req: { user: JwtPayload },
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.financeService.listSellerWallets(req.user, {
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Get('platform/finance/refunds')
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'List refund requests with snapshot/ledger preview',
    description:
      'Returns paginated refund requests and original order snapshot fields for finance review.',
  })
  @ApiOkResponse({ description: 'Paginated refund requests.' })
  listRefundRequests(
    @Req() req: { user: JwtPayload },
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.financeService.listRefundRequests(req.user, {
      status,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
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

