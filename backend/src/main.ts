import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import fs from 'fs';
import path from 'path';
import { AppModule } from './app.module';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { RequestContextInterceptor } from './common/interceptors/request-context.interceptor';
import { HttpMetricsInterceptor } from './common/interceptors/http-metrics.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { getCorsConfig } from './common/config/cors.config';
import { validateEnv } from './common/config/app.config';
import { csrfMiddleware } from './common/middleware/csrf.middleware';
import { JsonLoggerService } from './common/logger/json-logger.service';
import * as Sentry from '@sentry/nestjs';
import { AppService } from './app.service';

async function bootstrap() {
  const logger = new JsonLoggerService();
  validateEnv();

  const sentryDsn = process.env.SENTRY_DSN?.trim();
  if (sentryDsn) {
    const sentryTraceRateRaw = Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1);
    const sentryTraceRate =
      Number.isFinite(sentryTraceRateRaw) && sentryTraceRateRaw >= 0 && sentryTraceRateRaw <= 1
        ? sentryTraceRateRaw
        : 0.1;

    Sentry.init({
      dsn: sentryDsn,
      environment: process.env.NODE_ENV ?? 'development',
      tracesSampleRate: sentryTraceRate,
    });
  }

  const app = await NestFactory.create(AppModule, { rawBody: true });
  app.useLogger(logger);
  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // Security middleware
  app.use(helmet());

  app.use(cookieParser());

  // Backward compatibility: map legacy /api/* routes to /api/v1/*.
  app.use('/api', (req, _res, next) => {
    const url = req.url ?? '';
    const isAlreadyVersioned = url === '/v1' || url.startsWith('/v1/');
    const isUploadsPath = url === '/uploads' || url.startsWith('/uploads/');

    if (!isAlreadyVersioned && !isUploadsPath) {
      req.url = `/v1${url.startsWith('/') ? url : `/${url}`}`;
    }

    next();
  });

  for (const middleware of csrfMiddleware()) {
    app.use(middleware);
  }

  // Setup uploads directory
  const uploadsDir =
    process.env.UPLOADS_DIR?.trim() && process.env.UPLOADS_DIR.trim().length > 0
      ? process.env.UPLOADS_DIR.trim()
      : path.join(process.cwd(), 'uploads');
  fs.mkdirSync(uploadsDir, { recursive: true });
  app.use('/uploads', express.static(uploadsDir));
  app.use('/api/uploads', express.static(uploadsDir));
  app.use('/api/v1/uploads', express.static(uploadsDir));

  // Enable CORS with config
  app.enableCors(getCorsConfig());

  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (typeof origin === 'string' && origin.length > 0) {
      res.setHeader('X-Debug-Cors', '1');
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization, X-CSRF-Token',
      );
      res.setHeader(
        'Access-Control-Allow-Methods',
        'GET,POST,PATCH,DELETE,PUT,OPTIONS',
      );

      if (req.method === 'OPTIONS') {
        res.status(204).end();
        return;
      }
    }
    next();
  });

  // Global pipes and interceptors
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
  );
  app.useGlobalInterceptors(
    new HttpMetricsInterceptor(app.get(AppService)),
    new RequestContextInterceptor(),
    new ResponseInterceptor(),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  // Swagger documentation — only in development
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Nutopiano API')
      .setDescription('Multi-tenant, SaaS-ready backend for Nutopiano')
      .setVersion('1.0.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document);
  }

  // Start server
  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  logger.log(`Server is running on port ${port}`, 'Bootstrap');
}
bootstrap().catch((err: unknown) => {
  const logger = new JsonLoggerService();
  logger.error('Failed to start server', err instanceof Error ? err.stack : undefined, 'Bootstrap');
  process.exit(1);
});
