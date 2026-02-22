import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { ERROR_CODES } from '../constants/error.constants';
import { AppError } from '../types/errors';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    console.error('Exception caught by filter:', exception);
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let code: string = ERROR_CODES.INTERNAL_SERVER_ERROR;
    let details: Record<string, unknown> | null = null;
    let errors: unknown[] = [];

    if (exception instanceof AppError) {
      status = exception.httpStatus;
      message = exception.message;
      code = exception.code;
      details = exception.details ?? null;
    }

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object' && exceptionResponse) {
        const payload = exceptionResponse as {
          message?: string | string[];
          error?: string;
        };
        if (Array.isArray(payload.message)) {
          message = payload.message[0] ?? 'Validation error';
          errors = payload.message;
          code = ERROR_CODES.VALIDATION_FAILED;
        } else if (payload.message) {
          message = payload.message;
        } else if (payload.error) {
          message = payload.error;
        }
      }
    }

    response.status(status).json({
      success: false,
      code,
      message,
      details,
      errors,
    });
  }
}
