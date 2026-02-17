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

/**
 * Builds the logging configuration from environment variables.
 */
export function buildConfig(overrides?: Partial<LoggingConfig>): LoggingConfig {
  const defaults: LoggingConfig = {
    level: envVar("LOG_LEVEL", "info") as LogLevel,
    console: toBool(envVar("LOG_CONSOLE", "true"), true),
    file: toBool(envVar("LOG_FILE", "false"), false),
    filePath: envVar("LOG_FILE_PATH", "./logs/app.log"),
    fileMaxSize: toInt(envVar("LOG_FILE_MAXSIZE", "10485760"), 10 * 1024 * 1024),
    fileMaxFiles: toInt(envVar("LOG_FILE_MAXFILES", "5"), 5),
    http: toBool(envVar("LOG_HTTP", "false"), false),
    httpUrl: envVar("LOG_HTTP_URL", ""),
    httpApiKey: envVar("LOG_HTTP_API_KEY", ""),
  };

  return { ...defaults, ...overrides };
}

export const DEFAULT_CONFIG = buildConfig();
