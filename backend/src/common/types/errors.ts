import { HttpStatus } from '@nestjs/common';
import { ERROR_CODES } from '../constants/error.constants';

type CustomErrorCode = string & { readonly __brand: unique symbol };

export type AppErrorCode =
  | (typeof ERROR_CODES)[keyof typeof ERROR_CODES]
  | CustomErrorCode;

export class AppError extends Error {
  code: AppErrorCode;
  httpStatus: number;
  details?: Record<string, unknown> | null;

  constructor(params: {
    code: AppErrorCode;
    message: string;
    httpStatus?: number;
    details?: Record<string, unknown> | null;
  }) {
    super(params.message);
    this.code = params.code;
    this.httpStatus = params.httpStatus ?? HttpStatus.INTERNAL_SERVER_ERROR;
    this.details = params.details ?? null;
  }
}

export class ValidationError extends AppError {
  constructor(
    message = 'Validation error',
    errors?: string[],
    details?: Record<string, unknown> | null,
  ) {
    super({
      code: ERROR_CODES.VALIDATION_FAILED,
      message,
      httpStatus: HttpStatus.BAD_REQUEST,
      details: details ?? (errors ? { errors } : null),
    });
  }
}

export class AuthError extends AppError {
  constructor(
    message = 'Unauthorized',
    code: AppErrorCode = ERROR_CODES.UNAUTHORIZED,
  ) {
    super({ code, message, httpStatus: HttpStatus.UNAUTHORIZED });
  }
}

export class NotFoundError extends AppError {
  constructor(
    message = 'Not found',
    code: AppErrorCode = ERROR_CODES.NOT_FOUND,
  ) {
    super({ code, message, httpStatus: HttpStatus.NOT_FOUND });
  }
}
