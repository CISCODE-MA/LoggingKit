/**
 * Unit tests for error stack parsing functionality.
 */

import {
  parseError,
  formatParsedError,
  createErrorParser,
  type ParsedStackFrame,
} from "../src/core/error-parser";

describe("Error Parser", () => {
  describe("parseError()", () => {
    test("parses error name and message", () => {
      const error = new Error("Test error message");
      const parsed = parseError(error);

      expect(parsed.name).toBe("Error");
      expect(parsed.message).toBe("Test error message");
    });

    test("parses TypeError correctly", () => {
      const error = new TypeError("Cannot read property");
      const parsed = parseError(error);

      expect(parsed.name).toBe("TypeError");
      expect(parsed.message).toBe("Cannot read property");
    });

    test("parses stack frames", () => {
      const error = new Error("Test");
      const parsed = parseError(error);

      expect(parsed.stack).toBeInstanceOf(Array);
      expect(parsed.stack.length).toBeGreaterThan(0);
    });

    test("respects maxLines parameter", () => {
      const error = new Error("Test");
      const parsed = parseError(error, 2);

      expect(parsed.stack.length).toBeLessThanOrEqual(2);
    });

    test("parses stack frame details", () => {
      const error = new Error("Test");
      const parsed = parseError(error);

      if (parsed.stack.length > 0) {
        const frame = parsed.stack[0]!;
        expect(frame).toHaveProperty("functionName");
        expect(frame).toHaveProperty("fileName");
        expect(frame).toHaveProperty("lineNumber");
        expect(frame).toHaveProperty("columnNumber");
        expect(frame).toHaveProperty("isNative");
        expect(frame).toHaveProperty("isNodeModules");
        expect(frame).toHaveProperty("raw");
      }
    });

    test("identifies node_modules frames", () => {
      // Create error with artificial stack
      const error = new Error("Test");
      const parsed = parseError(error);

      // At least some frames should be from node_modules in test environment
      const hasNodeModulesCheck = parsed.stack.some(
        (f: ParsedStackFrame) => typeof f.isNodeModules === "boolean",
      );
      expect(hasNodeModulesCheck).toBe(true);
    });

    test("handles error without stack", () => {
      const error = new Error("No stack");
      // Use Object.defineProperty to set stack to undefined (strict TS workaround)
      Object.defineProperty(error, "stack", { value: undefined });
      const parsed = parseError(error);

      expect(parsed.name).toBe("Error");
      expect(parsed.message).toBe("No stack");
      expect(parsed.stack).toEqual([]);
    });

    test("parses error cause chain", () => {
      const cause = new Error("Root cause");
      const error = new Error("Top level", { cause });
      const parsed = parseError(error);

      expect(parsed.cause).toBeDefined();
      expect(parsed.cause?.name).toBe("Error");
      expect(parsed.cause?.message).toBe("Root cause");
    });
  });

  describe("formatParsedError()", () => {
    test("formats error with name and message", () => {
      const parsed = {
        name: "Error",
        message: "Test message",
        stack: [],
      };
      const formatted = formatParsedError(parsed);

      expect(formatted).toBe("Error: Test message");
    });

    test("includes stack frames in output", () => {
      const parsed = {
        name: "Error",
        message: "Test",
        stack: [
          {
            functionName: "testFunction",
            fileName: "/app/src/test.ts",
            lineNumber: 10,
            columnNumber: 5,
            isNative: false,
            isNodeModules: false,
            raw: "at testFunction (/app/src/test.ts:10:5)",
          },
        ],
      };
      const formatted = formatParsedError(parsed);

      expect(formatted).toContain("Error: Test");
      expect(formatted).toContain("testFunction");
      expect(formatted).toContain("/app/src/test.ts");
      expect(formatted).toContain("10");
    });

    test("excludes node_modules frames by default", () => {
      const parsed = {
        name: "Error",
        message: "Test",
        stack: [
          {
            functionName: "appFunction",
            fileName: "/app/src/app.ts",
            lineNumber: 10,
            columnNumber: 5,
            isNative: false,
            isNodeModules: false,
            raw: "",
          },
          {
            functionName: "libFunction",
            fileName: "/app/node_modules/lib/index.js",
            lineNumber: 20,
            columnNumber: 3,
            isNative: false,
            isNodeModules: true,
            raw: "",
          },
        ],
      };
      const formatted = formatParsedError(parsed, false);

      expect(formatted).toContain("appFunction");
      expect(formatted).not.toContain("libFunction");
    });

    test("includes node_modules frames when requested", () => {
      const parsed = {
        name: "Error",
        message: "Test",
        stack: [
          {
            functionName: "libFunction",
            fileName: "/app/node_modules/lib/index.js",
            lineNumber: 20,
            columnNumber: 3,
            isNative: false,
            isNodeModules: true,
            raw: "",
          },
        ],
      };
      const formatted = formatParsedError(parsed, true);

      expect(formatted).toContain("libFunction");
    });

    test("formats cause chain", () => {
      const parsed = {
        name: "Error",
        message: "Top level",
        stack: [],
        cause: {
          name: "Error",
          message: "Root cause",
          stack: [],
        },
      };
      const formatted = formatParsedError(parsed);

      expect(formatted).toContain("Top level");
      expect(formatted).toContain("Caused by:");
      expect(formatted).toContain("Root cause");
    });
  });

  describe("createErrorParser()", () => {
    test("returns simple format when disabled", () => {
      const parser = createErrorParser({
        errorStackEnabled: false,
        errorStackLines: 10,
      });
      const error = new Error("Test");
      const result = parser(error);

      expect(result).toHaveProperty("name", "Error");
      expect(result).toHaveProperty("message", "Test");
      expect(result).toHaveProperty("stack");
      expect(result).not.toHaveProperty("parsedStack");
    });

    test("returns parsed format when enabled", () => {
      const parser = createErrorParser({
        errorStackEnabled: true,
        errorStackLines: 5,
      });
      const error = new Error("Test");
      const result = parser(error);

      expect(result).toHaveProperty("name", "Error");
      expect(result).toHaveProperty("message", "Test");
      expect(result).toHaveProperty("parsedStack");
      expect(result).toHaveProperty("fullStack");
      expect(result).toHaveProperty("formatted");
    });

    test("filters node_modules from parsedStack", () => {
      const parser = createErrorParser({
        errorStackEnabled: true,
        errorStackLines: 10,
      });
      const error = new Error("Test");
      const result = parser(error) as { parsedStack: ParsedStackFrame[] };

      // parsedStack should not contain node_modules frames
      const hasNodeModules = result.parsedStack.some((f) => f.isNodeModules);
      expect(hasNodeModules).toBe(false);
    });

    test("includes node_modules in fullStack", () => {
      const parser = createErrorParser({
        errorStackEnabled: true,
        errorStackLines: 50,
      });
      const error = new Error("Test");
      const result = parser(error) as { fullStack: ParsedStackFrame[] };

      // fullStack may contain node_modules frames (depends on test environment)
      expect(result.fullStack).toBeInstanceOf(Array);
    });
  });
});
