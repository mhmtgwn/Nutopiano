import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { HealthCheckDto } from './dto/health-check.dto';
import net from 'net';
import tls from 'tls';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(private readonly prisma: PrismaService) { }

  private async checkRedisConnection(redisUrl: string): Promise<boolean> {
    return new Promise((resolve) => {
      let parsed: URL;
      try {
        parsed = new URL(redisUrl);
      } catch {
        resolve(false);
        return;
      }

      const isTls = parsed.protocol === 'rediss:';
      const host = parsed.hostname;
      const port = Number(parsed.port || (isTls ? 6380 : 6379));
      const timeoutMs = 1500;

      if (!host || !Number.isFinite(port) || port <= 0) {
        resolve(false);
        return;
      }

      const onConnect = (socket: net.Socket | tls.TLSSocket) => {
        socket.write('*1\r\n$4\r\nPING\r\n');
      };

      const onData = (socket: net.Socket | tls.TLSSocket, chunk: Buffer) => {
        const response = chunk.toString('utf8');
        socket.end();
        resolve(response.startsWith('+PONG'));
      };

      const onError = () => resolve(false);

      const socket = isTls
        ? tls.connect({ host, port, rejectUnauthorized: false })
        : net.connect({ host, port });

      socket.setTimeout(timeoutMs);
      socket.once('connect', () => onConnect(socket));
      socket.once('data', (chunk) => onData(socket, chunk));
      socket.once('timeout', () => {
        socket.destroy();
        resolve(false);
      });
      socket.once('error', onError);
    });
  }

  /**
   * Perform a health check of the application
   * Includes database connectivity and basic system status
   */
  async check(): Promise<HealthCheckDto> {
    const startTime = Date.now();
    const checks: Record<string, boolean> = {
      app: true,
      database: false,
      redis: true,
    };

    try {
      // Test database connection
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = true;
    } catch (error) {
      this.logger.error('Database health check failed:', error);
      checks.database = false;
    }

    const redisUrl = (process.env.REDIS_URL ?? '').trim();
    if (redisUrl.length > 0) {
      checks.redis = await this.checkRedisConnection(redisUrl);
      if (!checks.redis) {
        this.logger.warn('Redis health check failed.');
      }
    }

    const duration = Date.now() - startTime;
    const isHealthy = Object.values(checks).every((status) => status === true);

    return {
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks,
      responseTime: `${duration}ms`,
      version: process.env.npm_package_version || '1.0.0',
    };
  }

  /**
   * Admin system dashboard — returns system health, database stats, and memory usage.
   */
  async adminDashboard(businessId: number) {
    const health = await this.check();

    const [userCount, sellerCount, orderCount, productCount, customerCount] =
      await Promise.all([
        this.prisma.user.count({ where: { businessId } }),
        this.prisma.seller.count({ where: { businessId } }),
        this.prisma.order.count({ where: { businessId } }),
        this.prisma.product.count({ where: { businessId } }),
        this.prisma.customer.count({ where: { businessId } }),
      ]);

    const memUsage = process.memoryUsage();

    return {
      health,
      stats: {
        users: userCount,
        sellers: sellerCount,
        orders: orderCount,
        products: productCount,
        customers: customerCount,
      },
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        memoryUsageMb: {
          rss: Math.round(memUsage.rss / 1024 / 1024),
          heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
          heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
        },
        uptime: Math.round(process.uptime()),
      },
    };
  }
}
