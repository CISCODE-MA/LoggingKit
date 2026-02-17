/**
 * Correlation ID utilities for request tracing.
 */

import { v4 as uuidv4 } from "uuid";

export const CORRELATION_ID_HEADER = "x-request-id";

/**
 * Extracts correlation ID from headers or generates a new one.
 */
export function getCorrelationId(headers: Record<string, string | string[] | undefined>): string {
  const headerValue = headers[CORRELATION_ID_HEADER] ?? headers["X-Request-Id"];

  if (typeof headerValue === "string" && headerValue.length > 0) {
    return headerValue;
  }

  if (Array.isArray(headerValue) && headerValue.length > 0 && headerValue[0]) {
    return headerValue[0];
  }

  return uuidv4();
}

/**
 * Generates a new correlation ID.
 */
export function generateCorrelationId(): string {
  return uuidv4();
}
