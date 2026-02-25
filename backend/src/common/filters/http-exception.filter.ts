import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';
import { ERROR_CODES } from '../constants/error.constants';
import { JsonLoggerService } from '../logger/json-logger.service';
import { AppError } from '../types/errors';

type ErrorResponsePayload = {
  success: false;
  code: string;
  message: string;
  errors: unknown[];
  details: Record<string, unknown> | null;
  requestId: string;
  timestamp: string;
};

type HttpExceptionBody = {
  message?: string | string[];
  error?: string;
  errors?: unknown[];
  details?: Record<string, unknown> | null;
};

const resolveCodeFromStatus = (status: number) => {
  if (status === 400 || status === 422) {
    return ERROR_CODES.VALIDATION_FAILED;
  }
  if (status === 401) return ERROR_CODES.UNAUTHORIZED;
  if (status === 403) return ERROR_CODES.FORBIDDEN;
  if (status === 404) return ERROR_CODES.NOT_FOUND;
  if (status === 409) return ERROR_CODES.CONFLICT;
  if (status >= 500) return ERROR_CODES.INTERNAL_SERVER_ERROR;
  return ERROR_CODES.INVALID_INPUT;
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger?: JsonLoggerService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const incomingRequestId = request?.header?.('x-request-id')?.trim();
    const requestId = incomingRequestId || randomUUID();
    response.setHeader('X-Request-Id', requestId);

    const timestamp = new Date().toISOString();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let code: string = ERROR_CODES.INTERNAL_SERVER_ERROR;
    let details: Record<string, unknown> | null = null;
    let errors: unknown[] = [];

    const csrfException =
      exception &&
      typeof exception === 'object' &&
      'code' in exception &&
      (exception as { code?: unknown }).code === 'EBADCSRFTOKEN';
    if (csrfException) {
      status = HttpStatus.FORBIDDEN;
      message = 'Invalid CSRF token';
      code = ERROR_CODES.FORBIDDEN;
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2002') {
        status = HttpStatus.CONFLICT;
        code = ERROR_CODES.ALREADY_EXISTS;
        message = 'Resource already exists';
      } else if (exception.code === 'P2025') {
        status = HttpStatus.NOT_FOUND;
        code = ERROR_CODES.NOT_FOUND;
        message = 'Resource not found';
      } else {
        status = HttpStatus.INTERNAL_SERVER_ERROR;
        code = ERROR_CODES.DATABASE_ERROR;
        message = 'Database operation failed';
      }

      details = {
        prismaCode: exception.code,
        meta:
          exception.meta && typeof exception.meta === 'object'
            ? exception.meta
            : null,
      };
    } else if (exception instanceof AppError) {
      status = exception.httpStatus;
      message = exception.message;
      code = exception.code;
      details = exception.details ?? null;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object' && exceptionResponse) {
        const payload = exceptionResponse as HttpExceptionBody;
        if (Array.isArray(payload.message)) {
          message = payload.message[0] ?? 'Validation error';
          errors = payload.message;
          code = ERROR_CODES.VALIDATION_FAILED;
        } else if (payload.message) {
          message = payload.message;
        } else if (payload.error) {
          message = payload.error;
        }
        if (Array.isArray(payload.errors)) {
          errors = payload.errors;
        }
        if (payload.details && typeof payload.details === 'object') {
          details = payload.details;
        }
      }

      if (!code || code === ERROR_CODES.INTERNAL_SERVER_ERROR) {
        code = resolveCodeFromStatus(status);
      }
    } else if (
      exception &&
      typeof exception === 'object' &&
      'message' in exception &&
      typeof (exception as { message?: unknown }).message === 'string'
    ) {
      message = (exception as { message: string }).message;
    }

    const payload: ErrorResponsePayload = {
      success: false,
      code,
      message,
      details,
      errors,
      requestId,
      timestamp,
    };

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger?.error(
        {
          requestId,
          status,
          code,
          path: request?.url,
          method: request?.method,
          message,
        },
        exception instanceof Error ? exception.stack : undefined,
        'HttpExceptionFilter',
      );
    } else {
      this.logger?.warn(
        {
          requestId,
          status,
          code,
          path: request?.url,
          method: request?.method,
          message,
        },
        'HttpExceptionFilter',
      );
    }

    response.status(status).json(payload);
  }
}
