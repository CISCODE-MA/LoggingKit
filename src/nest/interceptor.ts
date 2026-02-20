/**
 * CorrelationIdInterceptor - Automatically adds correlation ID to all requests.
 * Includes request/response body logging and performance metrics.
 */

import { CallHandler, ExecutionContext, Inject, Injectable, NestInterceptor } from "@nestjs/common";
import type { Observable } from "rxjs";
import { tap } from "rxjs/operators";

import { getCorrelationId, CORRELATION_ID_HEADER } from "../core/correlation";
import { createErrorParser } from "../core/error-parser";
import { createMasker } from "../core/masking";
import type { LoggingConfig, LoggerMetadata } from "../core/types";

import { LOGGING_CONFIG } from "./constants";
import { LoggingService } from "./service";

@Injectable()
export class CorrelationIdInterceptor implements NestInterceptor {
  private readonly masker: (data: unknown) => unknown;
  private readonly errorParser: (error: Error) => Record<string, unknown>;

  constructor(
    private readonly loggingService: LoggingService,
    @Inject(LOGGING_CONFIG) private readonly config: LoggingConfig,
  ) {
    this.masker = createMasker(config);
    this.errorParser = createErrorParser(config);
  }

  /**
   * Truncates body to configured max size and masks sensitive fields.
   */
  private processBody(body: unknown): unknown {
    if (body === undefined || body === null) {
      return undefined;
    }

    // Mask sensitive fields
    const masked = this.masker(body);

    // Truncate if too large
    const serialized = JSON.stringify(masked);
    if (serialized.length > this.config.bodyMaxSize) {
      return {
        _truncated: true,
        _originalSize: serialized.length,
        _maxSize: this.config.bodyMaxSize,
        _preview: serialized.slice(0, 500) + "...",
      };
    }

    return masked;
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
      method?: string;
      url?: string;
      body?: unknown;
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

    // Build request metadata
    const requestMeta: LoggerMetadata = {
      method,
      url,
      correlationId,
    };

    // Optionally include request body
    if (this.config.logRequestBody && request.body) {
      requestMeta.body = this.processBody(request.body);
    }

    request.logger.info(`Incoming request: ${method} ${url}`, requestMeta);

    return next.handle().pipe(
      tap({
        next: (responseBody: unknown) => {
          const duration = Date.now() - startTime;
          const isSlowRequest = this.config.perfEnabled && duration >= this.config.perfThreshold;

          // Build response metadata
          const responseMeta: LoggerMetadata = {
            method,
            url,
            correlationId,
            duration,
          };

          // Optionally include response body
          if (this.config.logResponseBody && responseBody !== undefined) {
            responseMeta.body = this.processBody(responseBody);
          }

          // Add performance warning for slow requests
          if (isSlowRequest) {
            responseMeta.slowRequest = true;
            responseMeta.perfThreshold = this.config.perfThreshold;
            request.logger?.warn(
              `Slow request detected: ${method} ${url} (${duration}ms)`,
              responseMeta,
            );
          } else {
            request.logger?.info(`Request completed: ${method} ${url}`, responseMeta);
          }
        },
        error: (error: unknown) => {
          const duration = Date.now() - startTime;

          // Build error metadata
          const errorMeta: LoggerMetadata = {
            method,
            url,
            correlationId,
            duration,
          };

          // Use error parser for better stack traces
          if (error instanceof Error) {
            const parsedError = this.errorParser(error);
            errorMeta.error = parsedError;
          } else {
            errorMeta.error = String(error);
          }

          request.logger?.error(`Request failed: ${method} ${url}`, errorMeta);
        },
      }),
    );
  }
}
