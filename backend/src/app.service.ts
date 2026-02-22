import { Injectable, Logger } from '@nestjs/common';
import {
  Counter,
  Gauge,
  Histogram,
  collectDefaultMetrics,
  register,
} from 'prom-client';
import net from 'net';
import tls from 'tls';
import { PrismaService } from './database/prisma.service';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);
  private static metricsInitialized = false;
  private static httpRequestsTotal: Counter<string>;
  private static httpRequestDurationSeconds: Histogram<string>;
  private static dbConnections: Gauge<string>;
  private static dbPingDurationMs: Gauge<string>;
  private static redisUsedMemoryBytes: Gauge<string>;
  private static redisConnectedClients: Gauge<string>;

  constructor(private readonly prisma: PrismaService) {
    if (!AppService.metricsInitialized) {
      collectDefaultMetrics({
        prefix: 'nutopiano_',
      });

      AppService.httpRequestsTotal = new Counter({
        name: 'nutopiano_http_requests_total',
        help: 'Total HTTP requests served by application',
        labelNames: ['method', 'route', 'status_code'],
      });

      AppService.httpRequestDurationSeconds = new Histogram({
        name: 'nutopiano_http_request_duration_seconds',
        help: 'HTTP request duration in seconds',
        labelNames: ['method', 'route', 'status_code'],
        buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10],
      });

      AppService.dbConnections = new Gauge({
        name: 'nutopiano_db_connections',
        help: 'Active PostgreSQL connections for current database',
      });

      AppService.dbPingDurationMs = new Gauge({
        name: 'nutopiano_db_ping_duration_milliseconds',
        help: 'Database ping duration in milliseconds',
      });

      AppService.redisUsedMemoryBytes = new Gauge({
        name: 'nutopiano_redis_used_memory_bytes',
        help: 'Redis used memory in bytes',
      });

      AppService.redisConnectedClients = new Gauge({
        name: 'nutopiano_redis_connected_clients',
        help: 'Redis connected clients count',
      });

      AppService.metricsInitialized = true;
    }
  }

  getHello(): string {
    return 'Hello World!';
  }

  observeHttpRequest(input: {
    method: string;
    route: string;
    statusCode: number;
    durationSeconds: number;
  }) {
    const statusCode = Number.isFinite(input.statusCode)
      ? String(Math.max(0, Math.floor(input.statusCode)))
      : '0';
    const route = (input.route || 'unknown').slice(0, 200);
    const method = (input.method || 'GET').slice(0, 16);
    const durationSeconds = Number.isFinite(input.durationSeconds)
      ? Math.max(input.durationSeconds, 0)
      : 0;

    AppService.httpRequestsTotal.inc({
      method,
      route,
      status_code: statusCode,
    });
    AppService.httpRequestDurationSeconds.observe(
      {
        method,
        route,
        status_code: statusCode,
      },
      durationSeconds,
    );
  }

  private buildRedisCommand(parts: string[]): string {
    const header = `*${parts.length}\r\n`;
    const body = parts
      .map((part) => {
        const value = part ?? '';
        return `$${Buffer.byteLength(value, 'utf8')}\r\n${value}\r\n`;
      })
      .join('');
    return `${header}${body}`;
  }

  private async fetchRedisInfo(redisUrl: string): Promise<{
    usedMemoryBytes: number;
    connectedClients: number;
  } | null> {
    return new Promise((resolve) => {
      let parsed: URL;
      try {
        parsed = new URL(redisUrl);
      } catch {
        resolve(null);
        return;
      }

      const isTls = parsed.protocol === 'rediss:';
      const host = parsed.hostname;
      const port = Number(parsed.port || (isTls ? 6380 : 6379));
      const timeoutMs = 2000;

      if (!host || !Number.isFinite(port) || port <= 0) {
        resolve(null);
        return;
      }

      const username = parsed.username
        ? decodeURIComponent(parsed.username)
        : '';
      const password = parsed.password
        ? decodeURIComponent(parsed.password)
        : '';

      let completed = false;
      let buffer = '';
      const finish = (
        value: { usedMemoryBytes: number; connectedClients: number } | null,
      ) => {
        if (completed) return;
        completed = true;
        socket.destroy();
        resolve(value);
      };

      const parseAndFinish = () => {
        const usedMemoryMatch = buffer.match(/(?:^|\r\n)used_memory:(\d+)/);
        const connectedClientsMatch = buffer.match(
          /(?:^|\r\n)connected_clients:(\d+)/,
        );
        if (!usedMemoryMatch && !connectedClientsMatch) {
          return;
        }

        finish({
          usedMemoryBytes: usedMemoryMatch
            ? Number(usedMemoryMatch[1])
            : 0,
          connectedClients: connectedClientsMatch
            ? Number(connectedClientsMatch[1])
            : 0,
        });
      };

      const socket = isTls
        ? tls.connect({
            host,
            port,
            rejectUnauthorized: false,
          })
        : net.connect({ host, port });

      socket.setTimeout(timeoutMs);
      socket.on('connect', () => {
        if (password.length > 0) {
          if (username.length > 0) {
            socket.write(
              this.buildRedisCommand(['AUTH', username, password]),
            );
          } else {
            socket.write(this.buildRedisCommand(['AUTH', password]));
          }
        }
        socket.write(this.buildRedisCommand(['INFO']));
      });
      socket.on('data', (chunk) => {
        buffer += chunk.toString('utf8');
        if (buffer.includes('-NOAUTH') || buffer.includes('-ERR')) {
          finish(null);
          return;
        }
        parseAndFinish();
      });
      socket.on('timeout', () => finish(null));
      socket.on('error', () => finish(null));
      socket.on('end', () => {
        if (completed) return;
        parseAndFinish();
        if (!completed) finish(null);
      });
    });
  }

  private async refreshExternalMetrics() {
    try {
      const pingStart = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      AppService.dbPingDurationMs.set(Date.now() - pingStart);
    } catch (error) {
      this.logger.warn('DB ping metric could not be refreshed');
      AppService.dbPingDurationMs.set(0);
      this.logger.debug(
        error instanceof Error ? error.message : String(error),
      );
    }

    try {
      const rows = await this.prisma.$queryRaw<
        Array<{ connections: number }>
      >`SELECT COALESCE(numbackends, 0)::int AS connections FROM pg_stat_database WHERE datname = current_database()`;
      const connections = rows[0]?.connections ?? 0;
      AppService.dbConnections.set(Number.isFinite(connections) ? connections : 0);
    } catch (error) {
      this.logger.warn('DB connection metric could not be refreshed');
      AppService.dbConnections.set(0);
      this.logger.debug(
        error instanceof Error ? error.message : String(error),
      );
    }

    const redisUrl = (process.env.REDIS_URL ?? '').trim();
    if (!redisUrl) {
      AppService.redisUsedMemoryBytes.set(0);
      AppService.redisConnectedClients.set(0);
      return;
    }

    const redisInfo = await this.fetchRedisInfo(redisUrl);
    if (!redisInfo) {
      AppService.redisUsedMemoryBytes.set(0);
      AppService.redisConnectedClients.set(0);
      return;
    }

    AppService.redisUsedMemoryBytes.set(redisInfo.usedMemoryBytes);
    AppService.redisConnectedClients.set(redisInfo.connectedClients);
  }

  async getMetrics(): Promise<string> {
    await this.refreshExternalMetrics();
    return register.metrics();
  }

  getMetricsContentType(): string {
    return register.contentType;
  }
}
