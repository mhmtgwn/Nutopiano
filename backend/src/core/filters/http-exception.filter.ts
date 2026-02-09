import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.error('Exception caught by filter:', exception);
    }
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errors: unknown[] = [];

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object' && exceptionResponse) {
        const payload = exceptionResponse as { message?: string | string[]; error?: string };
        if (Array.isArray(payload.message)) {
          message = payload.message[0] ?? 'Validation error';
          errors = payload.message;
        } else if (payload.message) {
          message = payload.message;
        } else if (payload.error) {
          message = payload.error;
        }
      }
    }

    response.status(status).json({
      success: false,
      message,
      errors,
    });
  }
}
