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
  @Roles('ADMIN', 'SELLER', 'USER')
  @ApiOperation({
    summary: 'Dashboard summary',
    description:
      'Returns KPI summary for admin/seller/staff dashboard (scoped by role and business).',
  })
  @ApiOkResponse({ description: 'Dashboard summary KPI payload.' })
  @ApiForbiddenResponse({
    description: 'Forbidden for roles other than ADMIN/SELLER/USER.',
  })
  summary(@Req() req: { user: JwtPayload }) {
    return this.dashboardService.getSellerSummary(req.user);
  }

  @Get('reports/summary')
  @Roles('ADMIN', 'SELLER', 'USER')
  @ApiOperation({
    summary: 'Dashboard reports summary',
    description:
      'Returns basic sales/report metrics for admin/seller/staff dashboard (last 30 days + top products).',
  })
  @ApiOkResponse({ description: 'Reports summary payload.' })
  @ApiForbiddenResponse({
    description: 'Forbidden for roles other than ADMIN/SELLER/USER.',
  })
  reportsSummary(@Req() req: { user: JwtPayload }) {
    return this.dashboardService.getSellerReportsSummary(req.user);
  }
}

