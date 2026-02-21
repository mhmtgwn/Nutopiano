import { Controller, Get, Req, UseGuards } from '@nestjs/common';
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
import { DashboardService } from './dashboard.service';

@ApiTags('dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  @Roles('SELLER', 'STAFF')
  @ApiOperation({
    summary: 'Seller dashboard summary',
    description:
      'Returns KPI summary for seller portal (scoped by role and business).',
  })
  @ApiOkResponse({ description: 'Dashboard summary KPI payload.' })
  @ApiForbiddenResponse({
    description: 'Forbidden for roles other than SELLER/STAFF.',
  })
  summary(@Req() req: { user: JwtPayload }) {
    return this.dashboardService.getSellerSummary(req.user);
  }

  @Get('reports/summary')
  @Roles('SELLER', 'STAFF')
  @ApiOperation({
    summary: 'Seller reports summary',
    description:
      'Returns basic sales/report metrics for seller portal (last 30 days + top products).',
  })
  @ApiOkResponse({ description: 'Reports summary payload.' })
  @ApiForbiddenResponse({
    description: 'Forbidden for roles other than SELLER/STAFF.',
  })
  reportsSummary(@Req() req: { user: JwtPayload }) {
    return this.dashboardService.getSellerReportsSummary(req.user);
  }
}
