import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { HealthService } from './health.service';
import { HealthCheckDto } from './dto/health-check.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) { }

  /**
   * Health check endpoint
   * Returns 200 OK if the application and database are healthy
   * Used by load balancers and monitoring services
   */
  @Get()
  async check(): Promise<HealthCheckDto> {
    return this.healthService.check();
  }

  /**
   * Admin system dashboard
   * Returns health + system stats for admin panel
   */
  @Get('admin-dashboard')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  async adminDashboard(@Req() req: any) {
    return this.healthService.adminDashboard(req.user.businessId);
  }
}
