import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Observable } from 'rxjs';
import { requestContext } from '../context/request-context';

type RequestWithUser = {
  headers?: Record<string, string | string[] | undefined>;
  user?: {
    businessId?: string | number | null;
    userId?: string | number | null;
    role?: string | null;
  };
};

type ResponseWithSetHeader = {
  setHeader?: (name: string, value: string) => void;
};

@Injectable()
export class RequestContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest<RequestWithUser>();
    const res = http.getResponse<ResponseWithSetHeader>();

    const businessIdRaw = req?.user?.businessId;
    const userIdRaw = req?.user?.userId;

    const businessId =
      businessIdRaw !== undefined && businessIdRaw !== null
        ? Number(businessIdRaw)
        : undefined;
    const userId =
      userIdRaw !== undefined && userIdRaw !== null
        ? Number(userIdRaw)
        : undefined;

    const role =
      typeof req?.user?.role === 'string' ? req.user.role : undefined;
    const rawRequestId = req?.headers?.['x-request-id'];
    const requestId =
      (Array.isArray(rawRequestId) ? rawRequestId[0] : rawRequestId)?.trim() ||
      randomUUID();

    res?.setHeader?.('X-Request-Id', requestId);

    return new Observable((subscriber) => {
      requestContext.run(
        {
          businessId: Number.isFinite(businessId) ? businessId : undefined,
          userId: Number.isFinite(userId) ? userId : undefined,
          role,
          requestId,
        },
        () => {
          const sub = next.handle().subscribe({
            next: (value) => subscriber.next(value),
            error: (err) => subscriber.error(err),
            complete: () => subscriber.complete(),
          });

          return () => sub.unsubscribe();
        },
      );
    });
  }
}
