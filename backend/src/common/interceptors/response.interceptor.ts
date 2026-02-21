import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface StandardResponse<T> {
  success: boolean;
  data: T;
  message: string | null;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<
  T,
  StandardResponse<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<StandardResponse<T>> {
    const req = context.switchToHttp().getRequest<{ originalUrl?: string }>();
    const url = req?.originalUrl ?? '';
    if (url.endsWith('/metrics')) {
      return next.handle() as unknown as Observable<StandardResponse<T>>;
    }

    return next.handle().pipe(
      map((data) => ({
        success: true,
        data,
        message: null,
      })),
    );
  }
}
