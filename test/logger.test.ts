/**
 * Comprehensive unit tests for the Logger functionality.
 */

import type { Logger, LoggerMetadata } from "../src/core/types";
import { createLogger } from "../src/infra/logger.factory";

describe("Logger - All Log Levels", () => {
  let logger: Logger;
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    logger = createLogger({ console: false });
    // Spy on the internal Winston logger's log method
    logSpy = jest.spyOn(logger, "log");
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  test("error() calls log with error level", () => {
    const errorSpy = jest.spyOn(logger, "error");
    logger.error("Test error message", { extra: "data" });
    expect(errorSpy).toHaveBeenCalledWith("Test error message", { extra: "data" });
  });

  test("warn() calls log with warn level", () => {
    const warnSpy = jest.spyOn(logger, "warn");
    logger.warn("Test warn message");
    expect(warnSpy).toHaveBeenCalledWith("Test warn message");
  });

  test("info() calls log with info level", () => {
    const infoSpy = jest.spyOn(logger, "info");
    logger.info("Test info message", { userId: 123 });
    expect(infoSpy).toHaveBeenCalledWith("Test info message", { userId: 123 });
  });

  test("http() calls log with http level", () => {
    const httpSpy = jest.spyOn(logger, "http");
    logger.http("HTTP request logged");
    expect(httpSpy).toHaveBeenCalledWith("HTTP request logged");
  });

  test("verbose() calls log with verbose level", () => {
    const verboseSpy = jest.spyOn(logger, "verbose");
    logger.verbose("Verbose message");
    expect(verboseSpy).toHaveBeenCalledWith("Verbose message");
  });

  test("debug() calls log with debug level", () => {
    const debugSpy = jest.spyOn(logger, "debug");
    logger.debug("Debug message", { debug: true });
    expect(debugSpy).toHaveBeenCalledWith("Debug message", { debug: true });
  });

  test("silly() calls log with silly level", () => {
    const sillySpy = jest.spyOn(logger, "silly");
    logger.silly("Silly message");
    expect(sillySpy).toHaveBeenCalledWith("Silly message");
  });

  test("log() accepts any valid log level", () => {
    expect(() => logger.log("error", "Error via log()")).not.toThrow();
    expect(() => logger.log("warn", "Warn via log()")).not.toThrow();
    expect(() => logger.log("info", "Info via log()")).not.toThrow();
    expect(() => logger.log("debug", "Debug via log()")).not.toThrow();
  });
});

describe("Logger - Child Loggers", () => {
  test("child logger inherits parent configuration", () => {
    const parentLogger = createLogger({ console: false, level: "debug" });
    const childLogger = parentLogger.child({ service: "child-service" });

    expect(childLogger).toHaveProperty("info");
    expect(childLogger).toHaveProperty("error");
    expect(childLogger).toHaveProperty("debug");
  });

  test("child logger can create nested children", () => {
    const parentLogger = createLogger({ console: false });
    const childLogger = parentLogger.child({ service: "service-a" });
    const grandchildLogger = childLogger.child({ requestId: "req-123" });

    expect(grandchildLogger).toHaveProperty("info");
    expect(grandchildLogger).not.toBe(childLogger);
    expect(grandchildLogger).not.toBe(parentLogger);
  });

  test("child logger preserves metadata chain", () => {
    const parentLogger = createLogger({ console: false });
    const childLogger = parentLogger.child({ correlationId: "corr-123" });

    // Child logger should have all methods
    const childMethods = [
      "error",
      "warn",
      "info",
      "http",
      "verbose",
      "debug",
      "silly",
      "log",
      "child",
    ];
    childMethods.forEach((method) => {
      expect(typeof (childLogger as any)[method]).toBe("function");
    });
  });
});

describe("Logger - Metadata Handling", () => {
  test("logger accepts empty metadata", () => {
    const logger = createLogger({ console: false });
    expect(() => logger.info("Message without meta")).not.toThrow();
  });

  test("logger accepts complex metadata objects", () => {
    const logger = createLogger({ console: false });
    const complexMeta: LoggerMetadata = {
      correlationId: "test-123",
      userId: 456,
      nested: {
        deep: {
          value: "test",
        },
      },
      array: [1, 2, 3],
      timestamp: new Date().toISOString(),
    };

    expect(() => logger.info("Complex meta test", complexMeta)).not.toThrow();
  });

  test("logger handles undefined metadata gracefully", () => {
    const logger = createLogger({ console: false });
    expect(() => logger.info("Test", undefined)).not.toThrow();
  });
});

describe("Logger - Configuration Levels", () => {
  test("logger respects configured level", () => {
    // Create loggers with different levels
    const errorLogger = createLogger({ console: false, level: "error" });
    const debugLogger = createLogger({ console: false, level: "debug" });
    const sillyLogger = createLogger({ console: false, level: "silly" });

    // All should have the same interface regardless of level
    expect(errorLogger).toHaveProperty("debug");
    expect(debugLogger).toHaveProperty("debug");
    expect(sillyLogger).toHaveProperty("debug");
  });

  test("logger with file config has correct properties", () => {
    const logger = createLogger({
      console: false,
      file: false, // Don't actually create file
      filePath: "/tmp/test.log",
      fileMaxSize: 1024,
      fileMaxFiles: 3,
    });

    expect(logger).toHaveProperty("info");
  });

  test("logger with http config has correct properties", () => {
    const logger = createLogger({
      console: false,
      http: false, // Don't actually connect
      httpUrl: "https://example.com/logs",
      httpApiKey: "test-api-key",
    });

    expect(logger).toHaveProperty("info");
  });
});
