/**
 * Log masking/redaction utilities.
 * Automatically redacts sensitive fields from log metadata.
 */

import type { LoggingConfig } from "./types";

/** Default sensitive field patterns (case-insensitive matching) */
export const DEFAULT_MASK_FIELDS = [
  "password",
  "passwd",
  "secret",
  "token",
  "apikey",
  "api_key",
  "api-key",
  "authorization",
  "auth",
  "bearer",
  "credential",
  "private",
  "ssn",
  "social_security",
  "credit_card",
  "creditcard",
  "card_number",
  "cardnumber",
  "cvv",
  "pin",
  "otp",
  "access_token",
  "refresh_token",
  "id_token",
  "jwt",
];

/** Default mask replacement pattern */
export const DEFAULT_MASK_PATTERN = "[REDACTED]";

/**
 * Checks if a field name should be masked.
 * Matches if the field name contains the pattern (case-insensitive).
 */
function shouldMaskField(fieldName: string, maskFields: string[]): boolean {
  const lowerField = fieldName.toLowerCase();
  return maskFields.some((pattern) => {
    const lowerPattern = pattern.toLowerCase();
    // Match if field name contains the sensitive pattern
    // This ensures "password" matches "userPassword" but "id" doesn't match "id_token"
    return lowerField.includes(lowerPattern);
  });
}

/**
 * Recursively masks sensitive fields in an object.
 */
export function maskObject(
  obj: unknown,
  maskFields: string[],
  maskPattern: string,
  depth = 0,
  maxDepth = 10,
): unknown {
  // Prevent infinite recursion
  if (depth > maxDepth) {
    return obj;
  }

  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === "string") {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => maskObject(item, maskFields, maskPattern, depth + 1, maxDepth));
  }

  if (typeof obj === "object") {
    const masked: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      // If value is an object/array, always recurse (don't mask entire containers)
      if (typeof value === "object" && value !== null) {
        masked[key] = maskObject(value, maskFields, maskPattern, depth + 1, maxDepth);
      } else if (shouldMaskField(key, maskFields)) {
        // Only mask primitive values (strings, numbers, booleans)
        masked[key] = maskPattern;
      } else {
        masked[key] = value;
      }
    }
    return masked;
  }

  return obj;
}

/**
 * Creates a masking function based on configuration.
 */
export function createMasker(
  config: Pick<LoggingConfig, "maskEnabled" | "maskFields" | "maskPattern">,
): (data: unknown) => unknown {
  if (!config.maskEnabled) {
    return (data) => data;
  }

  const fields = config.maskFields.length > 0 ? config.maskFields : DEFAULT_MASK_FIELDS;
  const pattern = config.maskPattern || DEFAULT_MASK_PATTERN;

  return (data: unknown) => maskObject(data, fields, pattern);
}
