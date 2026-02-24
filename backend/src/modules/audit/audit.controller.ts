import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
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

@ApiTags('audit')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

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
  ) {
    return this.auditService.listLogs(Number(req.user.businessId), {
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      actionType: actionType?.trim() || undefined,
      targetType: targetType?.trim() || undefined,
    });
  }
}
