/**
 * LoggingService - Injectable NestJS service for logging.
 */

import { Inject, Injectable, Scope } from "@nestjs/common";

import type { Logger, LoggerMetadata, LogLevel } from "../core/types";

import { LOGGER } from "./constants";

@Injectable({ scope: Scope.TRANSIENT })
export class LoggingService implements Logger {
  constructor(@Inject(LOGGER) private readonly logger: Logger) {}

  error(message: string, meta?: LoggerMetadata): void {
    this.logger.error(message, meta);
  }

  warn(message: string, meta?: LoggerMetadata): void {
    this.logger.warn(message, meta);
  }

  info(message: string, meta?: LoggerMetadata): void {
    this.logger.info(message, meta);
  }

  http(message: string, meta?: LoggerMetadata): void {
    this.logger.http(message, meta);
  }

  verbose(message: string, meta?: LoggerMetadata): void {
    this.logger.verbose(message, meta);
  }

  debug(message: string, meta?: LoggerMetadata): void {
    this.logger.debug(message, meta);
  }

  silly(message: string, meta?: LoggerMetadata): void {
    this.logger.silly(message, meta);
  }

  log(level: LogLevel, message: string, meta?: LoggerMetadata): void {
    this.logger.log(level, message, meta);
  }

  child(meta: LoggerMetadata): Logger {
    return this.logger.child(meta);
  }

  /**
   * Creates a child logger with correlation ID for request tracing.
   */
  withCorrelationId(correlationId: string): Logger {
    return this.logger.child({ correlationId });
  }
}
