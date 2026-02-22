import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { AppService } from '../../app.service';

type RequestLike = {
  method?: string;
  route?: { path?: string };
  originalUrl?: string;
  url?: string;
};

type ResponseLike = {
  statusCode?: number;
};

@Injectable()
export class HttpMetricsInterceptor implements NestInterceptor {
  constructor(private readonly appService: AppService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest<RequestLike>();
    const res = http.getResponse<ResponseLike>();

    const start = process.hrtime.bigint();

    return next.handle().pipe(
      finalize(() => {
        const routePath =
          req?.route?.path ??
          (req?.originalUrl ?? req?.url ?? 'unknown').split('?')[0];
        if (routePath.includes('/metrics')) {
          return;
        }

        const elapsedNs = process.hrtime.bigint() - start;
        const durationSeconds = Number(elapsedNs) / 1_000_000_000;

        this.appService.observeHttpRequest({
          method: (req?.method ?? 'GET').toUpperCase(),
          route: routePath || 'unknown',
          statusCode: Number(res?.statusCode ?? 0),
          durationSeconds,
        });
      }),
    );
  }
}
