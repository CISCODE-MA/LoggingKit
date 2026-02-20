/**
 * Configuration utilities for the logging kit.
 * Reads from environment variables with per-environment overrides.
 */

import type { LoggingConfig, LogLevel } from "./types";

const ENV = (process.env["NODE_ENV"] ?? "development").toUpperCase();

/**
 * Reads an environment variable with optional per-env override.
 * For key = 'LOG_LEVEL' and ENV = 'PRODUCTION', checks:
 * 1) process.env.LOG_LEVEL_PRODUCTION
 * 2) process.env.LOG_LEVEL
 */
function envVar(key: string, defaultValue: string): string {
  const perEnvKey = `${key}_${ENV}`;
  if (process.env[perEnvKey] !== undefined) {
    return process.env[perEnvKey]!;
  }
  return process.env[key] ?? defaultValue;
}

function toBool(value: string | undefined, defaultValue = false): boolean {
  if (value === undefined) return defaultValue;
  return value.toLowerCase() === "true";
}

function toInt(value: string | undefined, defaultValue: number): number {
  if (value === undefined) return defaultValue;
  const n = parseInt(value, 10);
  return isNaN(n) ? defaultValue : n;
}

function toFloat(value: string | undefined, defaultValue: number): number {
  if (value === undefined) return defaultValue;
  const n = parseFloat(value);
  return isNaN(n) ? defaultValue : n;
}

function toArray(value: string | undefined, defaultValue: string[]): string[] {
  if (value === undefined || value.trim() === "") return defaultValue;
  return value
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Builds the logging configuration from environment variables.
 */
export function buildConfig(overrides?: Partial<LoggingConfig>): LoggingConfig {
  const defaults: LoggingConfig = {
    // Basic logging
    level: envVar("LOG_LEVEL", "info") as LogLevel,
    console: toBool(envVar("LOG_CONSOLE", "true"), true),

    // File transport
    file: toBool(envVar("LOG_FILE", "false"), false),
    filePath: envVar("LOG_FILE_PATH", "./logs/app.log"),
    fileMaxSize: toInt(envVar("LOG_FILE_MAXSIZE", "10485760"), 10 * 1024 * 1024),
    fileMaxFiles: toInt(envVar("LOG_FILE_MAXFILES", "5"), 5),

    // HTTP transport
    http: toBool(envVar("LOG_HTTP", "false"), false),
    httpUrl: envVar("LOG_HTTP_URL", ""),
    httpApiKey: envVar("LOG_HTTP_API_KEY", ""),

    // Log masking/redaction
    maskEnabled: toBool(envVar("LOG_MASK_ENABLED", "true"), true),
    maskFields: toArray(envVar("LOG_MASK_FIELDS", ""), []),
    maskPattern: envVar("LOG_MASK_PATTERN", "[REDACTED]"),

    // Request body logging
    logRequestBody: toBool(envVar("LOG_REQUEST_BODY", "false"), false),
    logResponseBody: toBool(envVar("LOG_RESPONSE_BODY", "false"), false),
    bodyMaxSize: toInt(envVar("LOG_BODY_MAX_SIZE", "10240"), 10 * 1024),

    // Performance metrics
    perfEnabled: toBool(envVar("LOG_PERF_ENABLED", "true"), true),
    perfThreshold: toInt(envVar("LOG_PERF_THRESHOLD", "500"), 500),

    // Log sampling
    samplingEnabled: toBool(envVar("LOG_SAMPLING_ENABLED", "false"), false),
    samplingRate: toFloat(envVar("LOG_SAMPLING_RATE", "0.1"), 0.1),

    // Error stack parsing
    errorStackEnabled: toBool(envVar("LOG_ERROR_STACK_ENABLED", "true"), true),
    errorStackLines: toInt(envVar("LOG_ERROR_STACK_LINES", "10"), 10),
  };

  return { ...defaults, ...overrides };
}

export const DEFAULT_CONFIG = buildConfig();
