import { Controller, Get, Header, Query, Req, Res, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '@common/decorators';
import { JwtAuthGuard, RolesGuard } from '@common/guards';
import { JwtPayload } from '../../auth/types/jwt-payload';
import { AuditService } from './audit.service';
import type { Response } from 'express';

@ApiTags('audit')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class AuditController {
  constructor(private readonly auditService: AuditService) { }

  @Get('platform/audit/logs')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({
    summary: 'List audit logs',
    description:
      'Returns business-scoped audit logs with optional action/target filters.',
  })
  @ApiOkResponse({ description: 'Paginated audit log payload.' })
  listAuditLogs(
    @Req() req: { user: JwtPayload },
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('actionType') actionType?: string,
    @Query('targetType') targetType?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.auditService.listLogs(Number(req.user.businessId), {
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      actionType: actionType?.trim() || undefined,
      targetType: targetType?.trim() || undefined,
      dateFrom: dateFrom?.trim() || undefined,
      dateTo: dateTo?.trim() || undefined,
    });
  }

  @Get('platform/audit/logs/export')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({
    summary: 'Export audit logs as CSV',
    description: 'Returns audit logs as CSV text.',
  })
  async exportAuditLogs(
    @Req() req: { user: JwtPayload },
    @Res() res: Response,
    @Query('actionType') actionType?: string,
    @Query('targetType') targetType?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const csv = await this.auditService.exportCsv(Number(req.user.businessId), {
      actionType: actionType?.trim() || undefined,
      targetType: targetType?.trim() || undefined,
      dateFrom: dateFrom?.trim() || undefined,
      dateTo: dateTo?.trim() || undefined,
    });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="audit-logs.csv"');
    res.send(csv);
  }
}
