/**
 * Winston logger factory.
 * Creates Logger instances backed by Winston.
 */

import winston from "winston";

import { buildConfig } from "../core/config";
import type { Logger, LoggerMetadata, LoggingConfig, LogLevel } from "../core/types";

import { createTransports } from "./transports";

/**
 * Wraps a Winston logger to implement our Logger interface.
 */
class WinstonLogger implements Logger {
  constructor(
    private readonly winstonLogger: winston.Logger,
    private readonly metadata: LoggerMetadata = {},
  ) {}

  private logWithMeta(level: LogLevel, message: string, meta?: LoggerMetadata): void {
    this.winstonLogger.log(level, message, { ...this.metadata, ...meta });
  }

  error(message: string, meta?: LoggerMetadata): void {
    this.logWithMeta("error", message, meta);
  }

  warn(message: string, meta?: LoggerMetadata): void {
    this.logWithMeta("warn", message, meta);
  }

  info(message: string, meta?: LoggerMetadata): void {
    this.logWithMeta("info", message, meta);
  }

  http(message: string, meta?: LoggerMetadata): void {
    this.logWithMeta("http", message, meta);
  }

  verbose(message: string, meta?: LoggerMetadata): void {
    this.logWithMeta("verbose", message, meta);
  }

  debug(message: string, meta?: LoggerMetadata): void {
    this.logWithMeta("debug", message, meta);
  }

  silly(message: string, meta?: LoggerMetadata): void {
    this.logWithMeta("silly", message, meta);
  }

  log(level: LogLevel, message: string, meta?: LoggerMetadata): void {
    this.logWithMeta(level, message, meta);
  }

  child(meta: LoggerMetadata): Logger {
    return new WinstonLogger(this.winstonLogger, { ...this.metadata, ...meta });
  }
}

/**
 * Creates a new Logger instance.
 */
export function createLogger(
  configOverrides?: Partial<LoggingConfig>,
  defaultMeta?: LoggerMetadata,
): Logger {
  const config = buildConfig(configOverrides);
  const transports = createTransports(config);

  const winstonLogger = winston.createLogger({
    level: config.level,
    defaultMeta,
    transports,
  });

  return new WinstonLogger(winstonLogger, defaultMeta);
}
