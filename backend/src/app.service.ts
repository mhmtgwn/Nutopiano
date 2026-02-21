import { Injectable } from '@nestjs/common';
import { collectDefaultMetrics, register } from 'prom-client';

@Injectable()
export class AppService {
  private static metricsInitialized = false;

  constructor() {
    if (!AppService.metricsInitialized) {
      collectDefaultMetrics({
        prefix: 'nutopiano_',
      });
      AppService.metricsInitialized = true;
    }
  }

  getHello(): string {
    return 'Hello World!';
  }

  async getMetrics(): Promise<string> {
    return register.metrics();
  }

  getMetricsContentType(): string {
    return register.contentType;
  }
}
