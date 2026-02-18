/**
 * Unit tests for transport creation.
 */

import type { LoggingConfig } from "../src/core/types";
import { createTransports } from "../src/infra/transports";

describe("Transports", () => {
  describe("createTransports()", () => {
    test("returns a silent fallback transport when all transports disabled", () => {
      const config: LoggingConfig = {
        level: "info",
        console: false,
        file: false,
        filePath: "",
        fileMaxSize: 0,
        fileMaxFiles: 0,
        http: false,
        httpUrl: "",
        httpApiKey: "",
      };

      const transports = createTransports(config);
      // Fallback silent transport to prevent Winston errors
      expect(transports.length).toBe(1);
      expect((transports[0] as { silent?: boolean }).silent).toBe(true);
    });

    test("includes Console transport when console is true", () => {
      const config: LoggingConfig = {
        level: "info",
        console: true,
        file: false,
        filePath: "",
        fileMaxSize: 0,
        fileMaxFiles: 0,
        http: false,
        httpUrl: "",
        httpApiKey: "",
      };

      const transports = createTransports(config);
      expect(transports.length).toBe(1);
      expect(transports[0]!.constructor.name).toBe("Console");
    });

    test("includes DailyRotateFile transport when file is true", () => {
      const config: LoggingConfig = {
        level: "info",
        console: false,
        file: true,
        filePath: "./logs/test.log",
        fileMaxSize: 1024,
        fileMaxFiles: 3,
        http: false,
        httpUrl: "",
        httpApiKey: "",
      };

      const transports = createTransports(config);
      expect(transports.length).toBe(1);
      expect(transports[0]!.constructor.name).toBe("DailyRotateFile");
    });

    test("includes Http transport when http is true and httpUrl is set", () => {
      const config: LoggingConfig = {
        level: "info",
        console: false,
        file: false,
        filePath: "",
        fileMaxSize: 0,
        fileMaxFiles: 0,
        http: true,
        httpUrl: "https://logs.example.com/api/logs",
        httpApiKey: "test-api-key",
      };

      const transports = createTransports(config);
      expect(transports.length).toBe(1);
      expect(transports[0]!.constructor.name).toBe("Http");
    });

    test("does not include Http transport when httpUrl is empty", () => {
      const config: LoggingConfig = {
        level: "info",
        console: false,
        file: false,
        filePath: "",
        fileMaxSize: 0,
        fileMaxFiles: 0,
        http: true,
        httpUrl: "", // Empty URL
        httpApiKey: "test-api-key",
      };

      const transports = createTransports(config);
      // Only fallback transport since no valid transports configured
      expect(transports.length).toBe(1);
      expect((transports[0] as { silent?: boolean }).silent).toBe(true);
    });

    test("includes multiple transports when enabled", () => {
      const config: LoggingConfig = {
        level: "debug",
        console: true,
        file: true,
        filePath: "./logs/multi.log",
        fileMaxSize: 1024,
        fileMaxFiles: 3,
        http: true,
        httpUrl: "https://logs.example.com/api",
        httpApiKey: "key",
      };

      const transports = createTransports(config);
      expect(transports.length).toBe(3);

      const transportNames = transports.map((t) => t.constructor.name);
      expect(transportNames).toContain("Console");
      expect(transportNames).toContain("DailyRotateFile");
      expect(transportNames).toContain("Http");
    });

    test("respects log level in transports", () => {
      const config: LoggingConfig = {
        level: "error",
        console: true,
        file: false,
        filePath: "",
        fileMaxSize: 0,
        fileMaxFiles: 0,
        http: false,
        httpUrl: "",
        httpApiKey: "",
      };

      const transports = createTransports(config);
      expect(transports.length).toBe(1);
      // Winston transport has level property
      expect((transports[0] as any).level).toBe("error");
    });
  });

  describe("HTTP Transport URL Parsing", () => {
    test("handles HTTPS URLs correctly", () => {
      const config: LoggingConfig = {
        level: "info",
        console: false,
        file: false,
        filePath: "",
        fileMaxSize: 0,
        fileMaxFiles: 0,
        http: true,
        httpUrl: "https://secure.example.com:8443/logs/ingest",
        httpApiKey: "secret-key",
      };

      const transports = createTransports(config);
      expect(transports.length).toBe(1);
    });

    test("handles HTTP URLs correctly", () => {
      const config: LoggingConfig = {
        level: "info",
        console: false,
        file: false,
        filePath: "",
        fileMaxSize: 0,
        fileMaxFiles: 0,
        http: true,
        httpUrl: "http://localhost:3000/logs",
        httpApiKey: "dev-key",
      };

      const transports = createTransports(config);
      expect(transports.length).toBe(1);
    });

    test("handles URLs with query parameters", () => {
      const config: LoggingConfig = {
        level: "info",
        console: false,
        file: false,
        filePath: "",
        fileMaxSize: 0,
        fileMaxFiles: 0,
        http: true,
        httpUrl: "https://api.example.com/logs?env=test&version=1",
        httpApiKey: "api-key",
      };

      const transports = createTransports(config);
      expect(transports.length).toBe(1);
    });
  });
});
