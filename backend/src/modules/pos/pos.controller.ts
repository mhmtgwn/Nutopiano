import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Res,
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
import { PosService } from './pos.service';
import { OpenRegisterSessionDto } from './dto/open-register-session.dto';
import { CloseRegisterSessionDto } from './dto/close-register-session.dto';
import { PosReturnOrderDto } from './dto/pos-return-order.dto';
import { ApplyCustomerBalanceDto } from './dto/apply-customer-balance.dto';
import { ApplySplitPaymentsDto } from './dto/apply-split-payments.dto';
import type { Response } from 'express';

@ApiTags('pos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'ADMIN', 'SELLER', 'STAFF')
@Controller('pos')
export class PosController {
  constructor(private readonly posService: PosService) {}

  @Get('register-session/current')
  @ApiOperation({
    summary: 'Get active cash register session',
  })
  @ApiOkResponse({
    description: 'Returns currently active register session for business.',
  })
  getCurrent(@Req() req: { user: JwtPayload }) {
    return this.posService.getCurrentSession(req.user);
  }

  @Get('register-session/history')
  @ApiOperation({
    summary: 'List cash register sessions',
  })
  @ApiOkResponse({
    description: 'Returns latest cash register sessions for business.',
  })
  list(
    @Req() req: { user: JwtPayload },
    @Query('limit') limit?: string,
  ) {
    return this.posService.listSessions(req.user, limit ? Number(limit) : 20);
  }

  @Post('register-session/open')
  @ApiOperation({
    summary: 'Open cash register session',
  })
  @ApiOkResponse({
    description: 'Creates a new active cash register session.',
  })
  open(@Req() req: { user: JwtPayload }, @Body() payload: OpenRegisterSessionDto) {
    return this.posService.openSession(req.user, payload);
  }

  @Post('register-session/close')
  @ApiOperation({
    summary: 'Close active cash register session',
  })
  @ApiOkResponse({
    description: 'Closes current active cash register session.',
  })
  close(
    @Req() req: { user: JwtPayload },
    @Body() payload: CloseRegisterSessionDto,
  ) {
    return this.posService.closeSession(req.user, payload);
  }

  @Get('products/barcode/:code')
  @ApiOperation({
    summary: 'Find product by barcode',
    description:
      'Looks up product or variant by SKU/barcode in current business.',
  })
  @ApiOkResponse({
    description: 'Matched product/variant payload.',
  })
  findByBarcode(
    @Req() req: { user: JwtPayload },
    @Param('code') code: string,
  ) {
    return this.posService.findProductByBarcode(req.user, code);
  }

  @Get('products/search')
  @ApiOperation({
    summary: 'Search products for POS',
    description:
      'Searches active products/variants by name, SKU, description or id in current business.',
  })
  @ApiOkResponse({
    description: 'Array of matched product/variant summaries.',
  })
  searchProducts(
    @Req() req: { user: JwtPayload },
    @Query('q') q?: string,
    @Query('limit') limit?: string,
  ) {
    return this.posService.searchProducts(req.user, {
      q,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('customers/search')
  @ApiOperation({
    summary: 'Search customers for POS',
    description: 'Searches customers by name/phone/id and returns balance data.',
  })
  @ApiOkResponse({
    description: 'Array of customer summaries.',
  })
  searchCustomers(
    @Req() req: { user: JwtPayload },
    @Query('q') q?: string,
    @Query('limit') limit?: string,
  ) {
    return this.posService.searchCustomers(req.user, {
      q,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('customers/:id')
  @ApiOperation({
    summary: 'Get customer by id for POS',
  })
  @ApiOkResponse({
    description: 'Customer summary with current balance.',
  })
  findCustomer(@Req() req: { user: JwtPayload }, @Param('id') id: string) {
    return this.posService.findCustomerById(req.user, Number(id));
  }

  @Get('reports/end-of-day')
  @ApiOperation({
    summary: 'End-of-day POS report',
    description:
      'Returns order, payment and register-session summary for a given day (UTC).',
  })
  @ApiOkResponse({
    description: 'End-of-day report payload.',
  })
  endOfDay(
    @Req() req: { user: JwtPayload },
    @Query('date') date?: string,
  ) {
    return this.posService.getEndOfDayReport(req.user, date);
  }

  @Get('reports/shifts')
  @ApiOperation({
    summary: 'Shift list report',
    description:
      'Returns shift history with register/staff filters and variance/duration metrics.',
  })
  @ApiOkResponse({
    description: 'Shift rows for selected filters.',
  })
  listShifts(
    @Req() req: { user: JwtPayload },
    @Query('userId') userId?: string,
    @Query('registerCode') registerCode?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedUserId = userId ? Number(userId) : undefined;
    const parsedLimit = limit ? Number(limit) : undefined;
    return this.posService.listShifts(req.user, {
      userId:
        parsedUserId && Number.isFinite(parsedUserId)
          ? parsedUserId
          : undefined,
      registerCode,
      dateFrom,
      dateTo,
      limit:
        parsedLimit && Number.isFinite(parsedLimit) ? parsedLimit : undefined,
    });
  }

  @Get('reports/staff-sales')
  @ApiOperation({
    summary: 'Staff sales report',
    description:
      'Aggregates POS orders/payments by staff for selected date range.',
  })
  @ApiOkResponse({
    description: 'Staff sales summary rows and totals.',
  })
  staffSales(
    @Req() req: { user: JwtPayload },
    @Query('userId') userId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const parsedUserId = userId ? Number(userId) : undefined;
    return this.posService.getStaffSalesReport(req.user, {
      userId:
        parsedUserId && Number.isFinite(parsedUserId)
          ? parsedUserId
          : undefined,
      dateFrom,
      dateTo,
    });
  }

  @Get('reports/sales')
  @ApiOperation({
    summary: 'POS sales analytics report',
    description:
      'Returns sales trend (day/week/month), top products and payment breakdown for selected range.',
  })
  @ApiOkResponse({
    description: 'Sales analytics payload.',
  })
  salesReport(
    @Req() req: { user: JwtPayload },
    @Query('period') period?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('topLimit') topLimit?: string,
  ) {
    const parsedTopLimit = topLimit ? Number(topLimit) : undefined;
    return this.posService.getSalesReport(req.user, {
      period,
      dateFrom,
      dateTo,
      topLimit:
        parsedTopLimit && Number.isFinite(parsedTopLimit)
          ? parsedTopLimit
          : undefined,
    });
  }

  @Get('reports/sales/export')
  @ApiOperation({
    summary: 'Export POS sales analytics (CSV)',
    description:
      'Exports current sales analytics payload as CSV (Excel-compatible).',
  })
  @ApiOkResponse({
    description: 'CSV document',
  })
  async exportSalesReport(
    @Req() req: { user: JwtPayload },
    @Res() res: Response,
    @Query('period') period?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('topLimit') topLimit?: string,
  ) {
    const parsedTopLimit = topLimit ? Number(topLimit) : undefined;
    const csv = await this.posService.exportSalesReportCsv(req.user, {
      period,
      dateFrom,
      dateTo,
      topLimit:
        parsedTopLimit && Number.isFinite(parsedTopLimit)
          ? parsedTopLimit
          : undefined,
    });

    const dateStamp = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="pos-sales-report-${dateStamp}.csv"`,
    );
    res.send(csv);
  }

  @Post('orders/:id/return')
  @ApiOperation({
    summary: 'Return POS order',
    description:
      'Executes POS return flow: restore stock, set order status to RETURNED/CANCELLED and create negative refund payment.',
  })
  @ApiOkResponse({
    description: 'POS return completed.',
  })
  returnPosOrder(
    @Req() req: { user: JwtPayload },
    @Param('id') id: string,
    @Body() payload: PosReturnOrderDto,
  ) {
    return this.posService.returnPosOrder(req.user, Number(id), payload);
  }

  @Get('orders/:id/invoice')
  @ApiOperation({
    summary: 'Get POS order invoice payload',
    description:
      'Returns A4 invoice data for a POS order (business, customer, line-level tax and totals).',
  })
  @ApiOkResponse({
    description: 'Invoice payload for client-side A4 print/PDF.',
  })
  getOrderInvoice(
    @Req() req: { user: JwtPayload },
    @Param('id') id: string,
  ) {
    return this.posService.getOrderInvoice(req.user, Number(id));
  }

  @Post('orders/:id/apply-balance')
  @ApiOperation({
    summary: 'Apply customer balance to order',
    description:
      'Uses customer wallet balance as payment for the given order and creates a payment row.',
  })
  @ApiOkResponse({
    description: 'Applied balance result payload.',
  })
  applyBalance(
    @Req() req: { user: JwtPayload },
    @Param('id') id: string,
    @Body() payload: ApplyCustomerBalanceDto,
  ) {
    return this.posService.applyCustomerBalance(req.user, Number(id), payload);
  }

  @Post('orders/:id/split-payment')
  @ApiOperation({
    summary: 'Apply split payment to order',
    description:
      'Creates multiple payment rows for a single order in one transaction. Total split amount cannot exceed remaining due.',
  })
  @ApiOkResponse({
    description: 'Split payment result payload.',
  })
  applySplitPayment(
    @Req() req: { user: JwtPayload },
    @Param('id') id: string,
    @Body() payload: ApplySplitPaymentsDto,
  ) {
    return this.posService.applySplitPayments(req.user, Number(id), payload);
  }
}
