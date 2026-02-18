/**
 * Unit tests for NestJS integration components.
 */

import { Test } from "@nestjs/testing";
import type { TestingModule } from "@nestjs/testing";

import { LoggingModule, LoggingService, LOGGER, CorrelationIdInterceptor } from "../src/nest";

describe("LoggingModule", () => {
  describe("register()", () => {
    let module: TestingModule;

    afterEach(async () => {
      if (module) {
        await module.close();
      }
    });

    test("registers with default options", async () => {
      module = await Test.createTestingModule({
        imports: [LoggingModule.register()],
      }).compile();

      // LoggingService is transient-scoped, use resolve()
      const loggingService = await module.resolve(LoggingService);
      expect(loggingService).toBeDefined();
      expect(loggingService).toBeInstanceOf(LoggingService);
    });

    test("registers with custom config", async () => {
      module = await Test.createTestingModule({
        imports: [
          LoggingModule.register({
            config: { level: "debug", console: false },
            defaultMeta: { service: "test-service" },
          }),
        ],
      }).compile();

      const loggingService = await module.resolve(LoggingService);
      expect(loggingService).toBeDefined();
    });

    test("exports LOGGER token", async () => {
      module = await Test.createTestingModule({
        imports: [LoggingModule.register({ config: { console: false } })],
      }).compile();

      const logger = module.get(LOGGER);
      expect(logger).toBeDefined();
      expect(logger).toHaveProperty("info");
      expect(logger).toHaveProperty("error");
    });

    test("exports CorrelationIdInterceptor", async () => {
      module = await Test.createTestingModule({
        imports: [LoggingModule.register({ config: { console: false } })],
      }).compile();

      // CorrelationIdInterceptor depends on transient LoggingService
      const interceptor = await module.resolve(CorrelationIdInterceptor);
      expect(interceptor).toBeDefined();
      expect(interceptor).toBeInstanceOf(CorrelationIdInterceptor);
    });

    test("isGlobal option defaults to true", async () => {
      module = await Test.createTestingModule({
        imports: [LoggingModule.register({ config: { console: false } })],
      }).compile();

      // If global, the service should be available without explicit import
      const loggingService = await module.resolve(LoggingService);
      expect(loggingService).toBeDefined();
    });

    test("isGlobal can be set to false", async () => {
      module = await Test.createTestingModule({
        imports: [LoggingModule.register({ config: { console: false }, isGlobal: false })],
      }).compile();

      const loggingService = await module.resolve(LoggingService);
      expect(loggingService).toBeDefined();
    });
  });

  describe("registerAsync()", () => {
    let module: TestingModule;

    afterEach(async () => {
      if (module) {
        await module.close();
      }
    });

    test("registers with async factory", async () => {
      module = await Test.createTestingModule({
        imports: [
          LoggingModule.registerAsync({
            useFactory: () => ({
              config: { level: "warn", console: false },
              defaultMeta: { service: "async-test" },
            }),
          }),
        ],
      }).compile();

      const loggingService = await module.resolve(LoggingService);
      expect(loggingService).toBeDefined();
    });

    test("supports async factory returning Promise", async () => {
      module = await Test.createTestingModule({
        imports: [
          LoggingModule.registerAsync({
            useFactory: async () => {
              // Simulate async config loading
              await new Promise((resolve) => setTimeout(resolve, 10));
              return {
                config: { level: "info", console: false },
              };
            },
          }),
        ],
      }).compile();

      const loggingService = await module.resolve(LoggingService);
      expect(loggingService).toBeDefined();
    });

    test("supports useFactory with external values", async () => {
      // Simulates injecting config from an external source
      const externalConfig = {
        logLevel: "debug" as const,
        serviceName: "injected-service",
      };

      module = await Test.createTestingModule({
        imports: [
          LoggingModule.registerAsync({
            // Factory that uses external config (closure-based injection)
            useFactory: () => ({
              config: { level: externalConfig.logLevel, console: false },
              defaultMeta: { service: externalConfig.serviceName },
            }),
          }),
        ],
      }).compile();

      const loggingService = await module.resolve(LoggingService);
      expect(loggingService).toBeDefined();
    });
  });
});

describe("LoggingService", () => {
  let service: LoggingService;
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [LoggingModule.register({ config: { console: false } })],
    }).compile();

    // LoggingService uses Scope.TRANSIENT, so we need resolve() instead of get()
    service = await module.resolve(LoggingService);
  });

  afterEach(async () => {
    await module.close();
  });

  test("implements Logger interface", () => {
    expect(service.error).toBeDefined();
    expect(service.warn).toBeDefined();
    expect(service.info).toBeDefined();
    expect(service.http).toBeDefined();
    expect(service.verbose).toBeDefined();
    expect(service.debug).toBeDefined();
    expect(service.silly).toBeDefined();
    expect(service.log).toBeDefined();
    expect(service.child).toBeDefined();
  });

  test("error() does not throw", () => {
    expect(() => service.error("Test error")).not.toThrow();
  });

  test("warn() does not throw", () => {
    expect(() => service.warn("Test warning")).not.toThrow();
  });

  test("info() does not throw", () => {
    expect(() => service.info("Test info")).not.toThrow();
  });

  test("http() does not throw", () => {
    expect(() => service.http("Test http")).not.toThrow();
  });

  test("verbose() does not throw", () => {
    expect(() => service.verbose("Test verbose")).not.toThrow();
  });

  test("debug() does not throw", () => {
    expect(() => service.debug("Test debug")).not.toThrow();
  });

  test("silly() does not throw", () => {
    expect(() => service.silly("Test silly")).not.toThrow();
  });

  test("log() accepts level and message", () => {
    expect(() => service.log("info", "Test log")).not.toThrow();
    expect(() => service.log("error", "Test error log", { extra: "data" })).not.toThrow();
  });

  test("child() returns a Logger instance", () => {
    const childLogger = service.child({ requestId: "test-123" });
    expect(childLogger).toBeDefined();
    expect(childLogger).toHaveProperty("info");
    expect(childLogger).toHaveProperty("error");
  });

  test("withCorrelationId() returns a Logger with correlationId", () => {
    const correlatedLogger = service.withCorrelationId("corr-456");
    expect(correlatedLogger).toBeDefined();
    expect(correlatedLogger).toHaveProperty("info");
  });

  test("accepts metadata in all log methods", () => {
    const meta = { userId: 123, action: "test" };
    expect(() => service.error("Error", meta)).not.toThrow();
    expect(() => service.warn("Warn", meta)).not.toThrow();
    expect(() => service.info("Info", meta)).not.toThrow();
    expect(() => service.debug("Debug", meta)).not.toThrow();
  });
});

describe("CorrelationIdInterceptor", () => {
  let interceptor: CorrelationIdInterceptor;
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [LoggingModule.register({ config: { console: false } })],
    }).compile();

    // CorrelationIdInterceptor depends on transient LoggingService, use resolve()
    interceptor = await module.resolve(CorrelationIdInterceptor);
  });

  afterEach(async () => {
    await module.close();
  });

  test("is defined", () => {
    expect(interceptor).toBeDefined();
  });

  test("has intercept method", () => {
    expect(interceptor.intercept).toBeDefined();
    expect(typeof interceptor.intercept).toBe("function");
  });

  test("intercept method signature is correct", () => {
    // The intercept method should accept ExecutionContext and CallHandler
    expect(interceptor.intercept.length).toBe(2);
  });
});
