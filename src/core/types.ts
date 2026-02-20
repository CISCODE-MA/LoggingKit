/**
 * Core types for the logging kit.
 * This file must remain framework-free (no NestJS imports).
 */

export type LogLevel = "error" | "warn" | "info" | "http" | "verbose" | "debug" | "silly";

export interface LoggingConfig {
  /** Global log level */
  level: LogLevel;

  /** Console transport configuration */
  console: boolean;

  /** File transport configuration */
  file: boolean;
  filePath: string;
  fileMaxSize: number;
  fileMaxFiles: number;

  /** HTTP transport configuration (e.g., Dynatrace) */
  http: boolean;
  httpUrl: string;
  httpApiKey: string;

  /** Log masking/redaction configuration */
  maskEnabled: boolean;
  maskFields: string[];
  maskPattern: string;

  /** Request body logging configuration */
  logRequestBody: boolean;
  logResponseBody: boolean;
  bodyMaxSize: number;

  /** Performance metrics configuration */
  perfEnabled: boolean;
  perfThreshold: number;

  /** Log sampling configuration */
  samplingEnabled: boolean;
  samplingRate: number;

  /** Error stack parsing configuration */
  errorStackEnabled: boolean;
  errorStackLines: number;
}

export interface LoggerMetadata {
  correlationId?: string;
  [key: string]: unknown;
}

export interface Logger {
  error(message: string, meta?: LoggerMetadata): void;
  warn(message: string, meta?: LoggerMetadata): void;
  info(message: string, meta?: LoggerMetadata): void;
  http(message: string, meta?: LoggerMetadata): void;
  verbose(message: string, meta?: LoggerMetadata): void;
  debug(message: string, meta?: LoggerMetadata): void;
  silly(message: string, meta?: LoggerMetadata): void;
  log(level: LogLevel, message: string, meta?: LoggerMetadata): void;
  child(meta: LoggerMetadata): Logger;
}

export interface LoggingModuleOptions {
  /** Override configuration (takes precedence over env vars) */
  config?: Partial<LoggingConfig>;
  /** Default metadata to include in all logs */
  defaultMeta?: LoggerMetadata;
  /** Whether to register as global module */
  isGlobal?: boolean;
}
