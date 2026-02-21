export class HealthCheckDto {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime: number;
  checks: Record<string, boolean>;
  responseTime: string;
  version: string;
}
