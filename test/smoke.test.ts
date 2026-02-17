import { buildConfig, DEFAULT_CONFIG, generateCorrelationId, getCorrelationId } from "../src/core";
import { createLogger } from "../src/infra/logger.factory";

describe("Core - Config", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test("buildConfig returns defaults when no env vars set", () => {
    const config = buildConfig();
    expect(config.level).toBe("info");
    expect(config.console).toBe(true);
    expect(config.file).toBe(false);
    expect(config.http).toBe(false);
  });

  test("buildConfig respects overrides", () => {
    const config = buildConfig({ level: "debug", file: true });
    expect(config.level).toBe("debug");
    expect(config.file).toBe(true);
  });

  test("DEFAULT_CONFIG is valid LoggingConfig", () => {
    expect(DEFAULT_CONFIG).toHaveProperty("level");
    expect(DEFAULT_CONFIG).toHaveProperty("console");
    expect(DEFAULT_CONFIG).toHaveProperty("file");
    expect(DEFAULT_CONFIG).toHaveProperty("http");
  });
});

describe("Core - Correlation", () => {
  test("generateCorrelationId returns UUID", () => {
    const id = generateCorrelationId();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  test("getCorrelationId extracts from x-request-id header", () => {
    const headers = { "x-request-id": "test-correlation-id" };
    expect(getCorrelationId(headers)).toBe("test-correlation-id");
  });

  test("getCorrelationId generates new ID when header missing", () => {
    const headers = {};
    const id = getCorrelationId(headers);
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  test("getCorrelationId handles array header value", () => {
    const headers = { "x-request-id": ["first-id", "second-id"] };
    expect(getCorrelationId(headers)).toBe("first-id");
  });
});

describe("Infra - Logger Factory", () => {
  test("createLogger returns Logger instance", () => {
    const logger = createLogger({ console: false });
    expect(logger).toHaveProperty("info");
    expect(logger).toHaveProperty("error");
    expect(logger).toHaveProperty("warn");
    expect(logger).toHaveProperty("debug");
    expect(logger).toHaveProperty("child");
  });

  test("logger.child returns new Logger with metadata", () => {
    const logger = createLogger({ console: false });
    const childLogger = logger.child({ correlationId: "test-123" });
    expect(childLogger).toHaveProperty("info");
    expect(childLogger).not.toBe(logger);
  });

  test("createLogger accepts defaultMeta", () => {
    const logger = createLogger({ console: false }, { service: "test-service" });
    expect(logger).toHaveProperty("info");
  });
});

describe("Module Exports", () => {
  test("all public exports are available", async () => {
    const exports = await import("../src/index");

    // Core exports
    expect(exports.buildConfig).toBeDefined();
    expect(exports.DEFAULT_CONFIG).toBeDefined();
    expect(exports.getCorrelationId).toBeDefined();
    expect(exports.generateCorrelationId).toBeDefined();
    expect(exports.CORRELATION_ID_HEADER).toBeDefined();

    // Nest exports
    expect(exports.LoggingModule).toBeDefined();
    expect(exports.LoggingService).toBeDefined();
    expect(exports.CorrelationIdInterceptor).toBeDefined();
    expect(exports.InjectLogger).toBeDefined();
    expect(exports.LOGGER).toBeDefined();

    // Factory export
    expect(exports.createLogger).toBeDefined();
  });
});
