/**
 * Error stack parsing utilities.
 * Parses and formats error stacks for better readability.
 */

import type { LoggingConfig } from "./types";

export interface ParsedStackFrame {
  /** Function or method name */
  functionName: string;
  /** File path */
  fileName: string;
  /** Line number */
  lineNumber: number | null;
  /** Column number */
  columnNumber: number | null;
  /** Whether this is a native/internal frame */
  isNative: boolean;
  /** Whether this is from node_modules */
  isNodeModules: boolean;
  /** Raw frame string */
  raw: string;
}

export interface ParsedError {
  /** Error name/type */
  name: string;
  /** Error message */
  message: string;
  /** Parsed stack frames */
  stack: ParsedStackFrame[];
  /** Cause chain (if Error has cause) */
  cause?: ParsedError;
}

/**
 * Parses a single stack frame line.
 * Handles various formats:
 * - at functionName (file:line:col)
 * - at file:line:col
 * - at functionName (native)
 */
function parseStackFrame(line: string): ParsedStackFrame | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith("at ")) {
    return null;
  }

  const raw = trimmed;
  const content = trimmed.slice(3); // Remove "at "

  // Check for native
  if (content.includes("(native)") || content === "native") {
    return {
      functionName: content.replace(/\s*\(native\)/, "").trim() || "<native>",
      fileName: "native",
      lineNumber: null,
      columnNumber: null,
      isNative: true,
      isNodeModules: false,
      raw,
    };
  }

  // Pattern: functionName (file:line:col)
  const withParensMatch = content.match(/^(.+?)\s+\((.+):(\d+):(\d+)\)$/);
  if (withParensMatch) {
    const fileName = withParensMatch[2]!;
    return {
      functionName: withParensMatch[1]!.trim(),
      fileName,
      lineNumber: parseInt(withParensMatch[3]!, 10),
      columnNumber: parseInt(withParensMatch[4]!, 10),
      isNative: false,
      isNodeModules: fileName.includes("node_modules"),
      raw,
    };
  }

  // Pattern: functionName (file:line)
  const withParensNoColMatch = content.match(/^(.+?)\s+\((.+):(\d+)\)$/);
  if (withParensNoColMatch) {
    const fileName = withParensNoColMatch[2]!;
    return {
      functionName: withParensNoColMatch[1]!.trim(),
      fileName,
      lineNumber: parseInt(withParensNoColMatch[3]!, 10),
      columnNumber: null,
      isNative: false,
      isNodeModules: fileName.includes("node_modules"),
      raw,
    };
  }

  // Pattern: file:line:col (anonymous)
  const anonymousMatch = content.match(/^(.+):(\d+):(\d+)$/);
  if (anonymousMatch) {
    const fileName = anonymousMatch[1]!;
    return {
      functionName: "<anonymous>",
      fileName,
      lineNumber: parseInt(anonymousMatch[2]!, 10),
      columnNumber: parseInt(anonymousMatch[3]!, 10),
      isNative: false,
      isNodeModules: fileName.includes("node_modules"),
      raw,
    };
  }

  // Pattern: file:line (anonymous)
  const anonymousNoColMatch = content.match(/^(.+):(\d+)$/);
  if (anonymousNoColMatch) {
    const fileName = anonymousNoColMatch[1]!;
    return {
      functionName: "<anonymous>",
      fileName,
      lineNumber: parseInt(anonymousNoColMatch[2]!, 10),
      columnNumber: null,
      isNative: false,
      isNodeModules: fileName.includes("node_modules"),
      raw,
    };
  }

  // Fallback - just use the content as function name
  return {
    functionName: content,
    fileName: "unknown",
    lineNumber: null,
    columnNumber: null,
    isNative: false,
    isNodeModules: false,
    raw,
  };
}

/**
 * Parses an Error object into structured data.
 */
export function parseError(error: Error, maxLines = 10): ParsedError {
  const stack: ParsedStackFrame[] = [];

  if (error.stack) {
    const lines = error.stack.split("\n").slice(1); // Skip first line (error message)
    let count = 0;
    for (const line of lines) {
      if (count >= maxLines) break;
      const frame = parseStackFrame(line);
      if (frame) {
        stack.push(frame);
        count++;
      }
    }
  }

  const parsed: ParsedError = {
    name: error.name,
    message: error.message,
    stack,
  };

  // Handle Error cause chain (ES2022+)
  if ("cause" in error && error.cause instanceof Error) {
    parsed.cause = parseError(error.cause, maxLines);
  }

  return parsed;
}

/**
 * Formats a parsed error for logging.
 */
export function formatParsedError(parsed: ParsedError, includeNodeModules = false): string {
  const lines: string[] = [`${parsed.name}: ${parsed.message}`];

  for (const frame of parsed.stack) {
    if (!includeNodeModules && frame.isNodeModules) {
      continue;
    }

    let frameLine = `    at ${frame.functionName}`;
    if (frame.fileName !== "unknown" && frame.fileName !== "native") {
      frameLine += ` (${frame.fileName}`;
      if (frame.lineNumber !== null) {
        frameLine += `:${frame.lineNumber}`;
        if (frame.columnNumber !== null) {
          frameLine += `:${frame.columnNumber}`;
        }
      }
      frameLine += ")";
    }
    lines.push(frameLine);
  }

  if (parsed.cause) {
    lines.push(`  Caused by: ${formatParsedError(parsed.cause, includeNodeModules)}`);
  }

  return lines.join("\n");
}

/**
 * Creates an error parser based on configuration.
 */
export function createErrorParser(
  config: Pick<LoggingConfig, "errorStackEnabled" | "errorStackLines">,
): (error: Error) => Record<string, unknown> {
  if (!config.errorStackEnabled) {
    return (error) => ({
      name: error.name,
      message: error.message,
      stack: error.stack,
    });
  }

  return (error) => {
    const parsed = parseError(error, config.errorStackLines);
    return {
      name: parsed.name,
      message: parsed.message,
      parsedStack: parsed.stack.filter((f) => !f.isNodeModules),
      fullStack: parsed.stack,
      cause: parsed.cause,
      formatted: formatParsedError(parsed),
    };
  };
}
