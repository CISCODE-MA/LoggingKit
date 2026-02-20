/**
 * Winston logger factory.
 * Creates Logger instances backed by Winston.
 */

import winston from "winston";

import { buildConfig } from "../core/config";
import { createMasker } from "../core/masking";
import { createSampler } from "../core/sampling";
import type { Logger, LoggerMetadata, LoggingConfig, LogLevel } from "../core/types";

import { createTransports } from "./transports";

/**
 * Wraps a Winston logger to implement our Logger interface.
 * Includes masking and sampling functionality.
 */
class WinstonLogger implements Logger {
  private readonly masker: (data: unknown) => unknown;
  private readonly shouldSample: (level: LogLevel, message: string) => boolean;

  constructor(
    private readonly winstonLogger: winston.Logger,
    private readonly metadata: LoggerMetadata = {},
    private readonly config: LoggingConfig,
  ) {
    this.masker = createMasker(config);
    this.shouldSample = createSampler(config);
  }

  private logWithMeta(level: LogLevel, message: string, meta?: LoggerMetadata): void {
    // Apply sampling - skip log if sampled out
    if (!this.shouldSample(level, message)) {
      return;
    }

    // Apply masking to metadata
    const maskedMeta = this.masker({ ...this.metadata, ...meta }) as LoggerMetadata;
    this.winstonLogger.log(level, message, maskedMeta);
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
    return new WinstonLogger(this.winstonLogger, { ...this.metadata, ...meta }, this.config);
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

  return new WinstonLogger(winstonLogger, defaultMeta, config);
}
