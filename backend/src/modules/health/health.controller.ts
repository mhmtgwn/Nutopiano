import { Controller, Get, HttpStatus } from '@nestjs/common';
import { HealthService } from './health.service';
import { HealthCheckDto } from './dto/health-check.dto';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  /**
   * Health check endpoint
   * Returns 200 OK if the application and database are healthy
   * Used by load balancers and monitoring services
   */
  @Get()
  async check(): Promise<HealthCheckDto> {
    return this.healthService.check();
  }
}
