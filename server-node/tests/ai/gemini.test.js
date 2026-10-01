import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { GeminiService } from "../../src/ai/gemini.js";

describe("GeminiService", () => {
  const originalKey = process.env.GEMINI_API_KEY;

  afterEach(() => {
    process.env.GEMINI_API_KEY = originalKey;
  });

  it("throws clear error when GEMINI_API_KEY is not set", () => {
    delete process.env.GEMINI_API_KEY;
    const service = new GeminiService();

    expect(() => service.client).toThrow(
      "GEMINI_API_KEY is not configured. Please set a valid GEMINI_API_KEY in server-node/.env file."
    );
  });

  it("throws clear error when GEMINI_API_KEY is placeholder", () => {
    process.env.GEMINI_API_KEY = "YOUR_GEMINI_API_KEY";
    const service = new GeminiService();

    expect(() => service.client).toThrow(
      "GEMINI_API_KEY is not configured. Please set a valid GEMINI_API_KEY in server-node/.env file."
    );
  });
});
