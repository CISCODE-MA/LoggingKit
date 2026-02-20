/**
 * Unit tests for log masking functionality.
 */

import {
  createMasker,
  maskObject,
  DEFAULT_MASK_FIELDS,
  DEFAULT_MASK_PATTERN,
} from "../src/core/masking";

describe("Masking", () => {
  describe("maskObject()", () => {
    test("returns null/undefined unchanged", () => {
      expect(maskObject(null, DEFAULT_MASK_FIELDS, DEFAULT_MASK_PATTERN)).toBeNull();
      expect(maskObject(undefined, DEFAULT_MASK_FIELDS, DEFAULT_MASK_PATTERN)).toBeUndefined();
    });

    test("returns strings unchanged", () => {
      expect(maskObject("test string", DEFAULT_MASK_FIELDS, DEFAULT_MASK_PATTERN)).toBe(
        "test string",
      );
    });

    test("returns primitives unchanged", () => {
      expect(maskObject(123, DEFAULT_MASK_FIELDS, DEFAULT_MASK_PATTERN)).toBe(123);
      expect(maskObject(true, DEFAULT_MASK_FIELDS, DEFAULT_MASK_PATTERN)).toBe(true);
    });

    test("masks password fields", () => {
      const input = { username: "user", password: "secret123" };
      const result = maskObject(input, DEFAULT_MASK_FIELDS, DEFAULT_MASK_PATTERN);
      expect(result).toEqual({ username: "user", password: "[REDACTED]" });
    });

    test("masks token fields", () => {
      const input = { id: 1, accessToken: "abc123", refreshToken: "xyz789" };
      const result = maskObject(input, DEFAULT_MASK_FIELDS, DEFAULT_MASK_PATTERN);
      expect(result).toEqual({
        id: 1,
        accessToken: "[REDACTED]",
        refreshToken: "[REDACTED]",
      });
    });

    test("masks authorization fields", () => {
      const input = { authorization: "Bearer xyz", apiKey: "key123" };
      const result = maskObject(input, DEFAULT_MASK_FIELDS, DEFAULT_MASK_PATTERN);
      expect(result).toEqual({
        authorization: "[REDACTED]",
        apiKey: "[REDACTED]",
      });
    });

    test("masks nested objects", () => {
      const input = {
        user: {
          name: "John",
          credentials: {
            password: "secret",
            apiKey: "key",
          },
        },
      };
      const result = maskObject(input, DEFAULT_MASK_FIELDS, DEFAULT_MASK_PATTERN);
      expect(result).toEqual({
        user: {
          name: "John",
          credentials: {
            password: "[REDACTED]",
            apiKey: "[REDACTED]",
          },
        },
      });
    });

    test("masks arrays of objects", () => {
      const input = [
        { username: "user1", password: "pass1" },
        { username: "user2", password: "pass2" },
      ];
      const result = maskObject(input, DEFAULT_MASK_FIELDS, DEFAULT_MASK_PATTERN);
      expect(result).toEqual([
        { username: "user1", password: "[REDACTED]" },
        { username: "user2", password: "[REDACTED]" },
      ]);
    });

    test("uses custom mask pattern", () => {
      const input = { password: "secret" };
      const result = maskObject(input, DEFAULT_MASK_FIELDS, "***HIDDEN***");
      expect(result).toEqual({ password: "***HIDDEN***" });
    });

    test("uses custom mask fields", () => {
      const input = { customField: "sensitive", password: "value" };
      const result = maskObject(input, ["customField"], DEFAULT_MASK_PATTERN);
      expect(result).toEqual({
        customField: "[REDACTED]",
        password: "value", // Not masked when not in custom fields
      });
    });

    test("handles deeply nested structures", () => {
      const input = {
        level1: {
          level2: {
            level3: {
              level4: {
                secret: "hidden",
              },
            },
          },
        },
      };
      const result = maskObject(input, DEFAULT_MASK_FIELDS, DEFAULT_MASK_PATTERN);
      expect(result).toEqual({
        level1: {
          level2: {
            level3: {
              level4: {
                secret: "[REDACTED]",
              },
            },
          },
        },
      });
    });

    test("prevents infinite recursion with max depth", () => {
      // Create a structure that would be deep
      let deep: any = { value: "test" };
      for (let i = 0; i < 15; i++) {
        deep = { nested: deep };
      }
      // Should not throw
      expect(() => maskObject(deep, DEFAULT_MASK_FIELDS, DEFAULT_MASK_PATTERN)).not.toThrow();
    });
  });

  describe("createMasker()", () => {
    test("returns identity function when masking disabled", () => {
      const masker = createMasker({ maskEnabled: false, maskFields: [], maskPattern: "" });
      const input = { password: "secret" };
      expect(masker(input)).toBe(input); // Same reference
    });

    test("returns masking function when enabled", () => {
      const masker = createMasker({
        maskEnabled: true,
        maskFields: [],
        maskPattern: "[HIDDEN]",
      });
      const input = { password: "secret" };
      const result = masker(input);
      expect(result).toEqual({ password: "[HIDDEN]" });
    });

    test("uses custom fields when provided", () => {
      const masker = createMasker({
        maskEnabled: true,
        maskFields: ["mySecret"],
        maskPattern: "***",
      });
      const input = { mySecret: "value", password: "other" };
      const result = masker(input);
      expect(result).toEqual({
        mySecret: "***",
        password: "other",
      });
    });
  });

  describe("DEFAULT_MASK_FIELDS", () => {
    test("includes common sensitive field names", () => {
      expect(DEFAULT_MASK_FIELDS).toContain("password");
      expect(DEFAULT_MASK_FIELDS).toContain("token");
      expect(DEFAULT_MASK_FIELDS).toContain("apikey");
      expect(DEFAULT_MASK_FIELDS).toContain("authorization");
      expect(DEFAULT_MASK_FIELDS).toContain("secret");
      expect(DEFAULT_MASK_FIELDS).toContain("ssn");
      expect(DEFAULT_MASK_FIELDS).toContain("credit_card");
      expect(DEFAULT_MASK_FIELDS).toContain("cvv");
    });
  });
});
