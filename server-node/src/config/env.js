/**
 * env.js
 *
 * Validates and exports all environment variables used by the server.
 * Mirrors the Python backend behaviour:
 *   - PORT and GEMINI_MODEL have safe defaults and are validated at startup.
 *   - GEMINI_API_KEY is stored as-is here; the AI service validates it lazily
 *     on the first request (matching the Python GeminiService.client property).
 *   - TEST_POSTGRES_URL is optional; tests skip PG suites when it is absent.
 *
 * dotenv/config is imported in app.js before this module is first imported,
 * so process.env is already populated when this module runs.
 */

import { z } from "zod";

// ─── Schema ──────────────────────────────────────────────────────────────────

const EnvSchema = z.object({
  /** TCP port the Express server listens on. */
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

  /**
   * Gemini API key.  NOT required at startup — the AI service throws a
   * descriptive RuntimeError on the first generate request when absent,
   * exactly as the Python backend does.
   */
  GEMINI_API_KEY: z.string().optional().default(""),

  /**
   * Gemini model name.  Defaults to gemini-2.5-flash-lite (matching
   * .env.example).  The Python code defaults to gemini-3.1-flash-lite
   * in-code but the canonical value lives in .env — we honour .env.
   */
  GEMINI_MODEL: z.string().default("gemini-3.5-flash"),

  /** Optional PostgreSQL URL used only by integration tests. */
  TEST_POSTGRES_URL: z.string().optional().default(""),
});

// ─── Parse ───────────────────────────────────────────────────────────────────

const _parsed = EnvSchema.safeParse(process.env);

if (!_parsed.success) {
  console.error("❌  Invalid environment configuration:");
  console.error(_parsed.error.format());
  process.exit(1);
}

export const env = _parsed.data;
