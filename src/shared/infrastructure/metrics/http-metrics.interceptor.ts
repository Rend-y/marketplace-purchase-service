import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import type { Request, Response } from 'express';
import type { Observable } from 'rxjs';

import { MetricsService } from './metrics.service';

const NANOSECONDS_IN_SECOND = 1e9;
const UNMATCHED_ROUTE = 'unmatched';

interface RouteInfo {
  readonly path?: string;
}

const readRouteTemplate = (request: Request): string => {
  const route: unknown = request.route;

  if (typeof route === 'object' && route !== null) {
    const path = (route as RouteInfo).path;

    if (typeof path === 'string') {
      return path;
    }
  }

  return UNMATCHED_ROUTE;
};

@Injectable()
export class HttpMetricsInterceptor implements NestInterceptor {
  constructor(private readonly metrics: MetricsService) {}

  /**
   * Measurement is attached to the response lifecycle rather than to the handler observable:
   * the final status code is only known after the exception filter has written the response.
   */
  public intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const method = request.method;
    const startedAt = process.hrtime.bigint();

    this.metrics.startHttpRequest(method);

    let recorded = false;
    const record = (): void => {
      if (recorded) {
        return;
      }
      recorded = true;

      this.metrics.observeHttpRequest(
        {
          method,
          // The route template keeps cardinality bounded (`/purchases/:id`, not the concrete id).
          route: readRouteTemplate(request),
          statusCode: response.statusCode,
        },
        Number(process.hrtime.bigint() - startedAt) / NANOSECONDS_IN_SECOND,
      );
    };

    response.once('finish', record);
    response.once('close', record);

    return next.handle();
  }
}
