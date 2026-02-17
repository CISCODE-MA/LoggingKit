/**
 * Winston transport factory.
 * Creates transports based on configuration.
 */

import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";

import type { LoggingConfig } from "../core/types";

export function createTransports(config: LoggingConfig): winston.transport[] {
  const transports: winston.transport[] = [];

  if (config.console) {
    transports.push(
      new winston.transports.Console({
        level: config.level,
        format:
          process.env["NODE_ENV"] === "development"
            ? winston.format.combine(winston.format.colorize(), winston.format.simple())
            : winston.format.json(),
      }),
    );
  }

  if (config.file) {
    transports.push(
      new DailyRotateFile({
        level: config.level,
        filename: config.filePath,
        maxSize: config.fileMaxSize,
        maxFiles: config.fileMaxFiles,
        format: winston.format.json(),
      }),
    );
  }

  if (config.http && config.httpUrl) {
    const url = new URL(config.httpUrl);

    transports.push(
      new winston.transports.Http({
        level: config.level,
        format: winston.format.json(),
        host: url.hostname,
        port: parseInt(url.port, 10) || (url.protocol === "https:" ? 443 : 80),
        path: url.pathname + url.search,
        ssl: url.protocol === "https:",
        headers: {
          Authorization: `Api-Token ${config.httpApiKey}`,
          "Content-Type": "application/json; charset=utf-8",
        },
      }),
    );
  }

  return transports;
}
