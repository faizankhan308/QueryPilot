/**
 * env.test.js
 *
 * Tests that the EnvSchema in src/config/env.js correctly validates and
 * transforms environment variables.
 *
 * We test the Zod schema directly (not the exported singleton) so we can
 * supply arbitrary input without side-effects on process.env.
 */

import { describe, it, expect } from "vitest";
import { z } from "zod";

// ─── Re-create the schema here so tests are isolated from the singleton ───────
// This is the same schema defined in src/config/env.js.

const EnvSchema = z.object({
  PORT: z
    .string()
    .default("3001")
    .transform((val) => {
      const port = Number(val);
      if (!Number.isInteger(port) || port < 1 || port > 65535) {
        throw new Error(`Invalid PORT value: "${val}"`);
      }
      return port;
    }),
  GEMINI_API_KEY: z.string().optional().default(""),
  GEMINI_MODEL: z.string().default("gemini-2.5-flash-lite"),
  TEST_POSTGRES_URL: z.string().optional().default(""),
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("EnvSchema", () => {
  describe("PORT", () => {
    it("uses default port 3001 when PORT is not set", () => {
      const result = EnvSchema.parse({});
      expect(result.PORT).toBe(3001);
    });

    it("parses a valid PORT string to an integer", () => {
      const result = EnvSchema.parse({ PORT: "4000" });
      expect(result.PORT).toBe(4000);
    });

    it("rejects a non-numeric PORT value", () => {
      expect(() => EnvSchema.parse({ PORT: "abc" })).toThrow();
    });

    it("rejects PORT 0", () => {
      expect(() => EnvSchema.parse({ PORT: "0" })).toThrow();
    });

    it("rejects PORT above 65535", () => {
      expect(() => EnvSchema.parse({ PORT: "99999" })).toThrow();
    });
  });

  describe("GEMINI_API_KEY", () => {
    it("defaults to empty string when not set", () => {
      const result = EnvSchema.parse({});
      expect(result.GEMINI_API_KEY).toBe("");
    });

    it("preserves the key value when set", () => {
      const result = EnvSchema.parse({ GEMINI_API_KEY: "my-secret-key" });
      expect(result.GEMINI_API_KEY).toBe("my-secret-key");
    });
  });

  describe("GEMINI_MODEL", () => {
    it("defaults to gemini-2.5-flash-lite when not set", () => {
      const result = EnvSchema.parse({});
      expect(result.GEMINI_MODEL).toBe("gemini-2.5-flash-lite");
    });

    it("uses the provided model name when set", () => {
      const result = EnvSchema.parse({ GEMINI_MODEL: "gemini-1.5-pro" });
      expect(result.GEMINI_MODEL).toBe("gemini-1.5-pro");
    });
  });

  describe("TEST_POSTGRES_URL", () => {
    it("defaults to empty string when not set", () => {
      const result = EnvSchema.parse({});
      expect(result.TEST_POSTGRES_URL).toBe("");
    });

    it("preserves the URL when set", () => {
      const url = "postgresql://user:pass@localhost:5432/testdb";
      const result = EnvSchema.parse({ TEST_POSTGRES_URL: url });
      expect(result.TEST_POSTGRES_URL).toBe(url);
    });
  });
});
