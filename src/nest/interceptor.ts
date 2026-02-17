/**
 * CorrelationIdInterceptor - Automatically adds correlation ID to all requests.
 */

import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import type { Observable } from "rxjs";
import { tap } from "rxjs/operators";

import { getCorrelationId, CORRELATION_ID_HEADER } from "../core/correlation";

import { LoggingService } from "./service";

@Injectable()
export class CorrelationIdInterceptor implements NestInterceptor {
  constructor(private readonly loggingService: LoggingService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
      method?: string;
      url?: string;
      logger?: ReturnType<LoggingService["child"]>;
    }>();

    const correlationId = getCorrelationId(request.headers);

    // Attach correlation ID to request for downstream use
    request.headers[CORRELATION_ID_HEADER] = correlationId;

    // Create a child logger with correlation ID and attach to request
    request.logger = this.loggingService.withCorrelationId(correlationId);

    // Set correlation ID in response header
    const response = context.switchToHttp().getResponse<{
      setHeader?: (name: string, value: string) => void;
    }>();
    if (response.setHeader) {
      response.setHeader(CORRELATION_ID_HEADER, correlationId);
    }

    const startTime = Date.now();
    const method = request.method ?? "UNKNOWN";
    const url = request.url ?? "/";

    request.logger.info(`Incoming request: ${method} ${url}`, {
      method,
      url,
      correlationId,
    });

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          request.logger?.info(`Request completed: ${method} ${url}`, {
            method,
            url,
            correlationId,
            duration,
          });
        },
        error: (error: unknown) => {
          const duration = Date.now() - startTime;
          request.logger?.error(`Request failed: ${method} ${url}`, {
            method,
            url,
            correlationId,
            duration,
            error: error instanceof Error ? error.message : String(error),
          });
        },
      }),
    );
  }
}
