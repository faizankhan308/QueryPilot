/**
 * gemini.js
 *
 * Google Gemini AI Service for generating SQL queries from natural language.
 * Mirrors Python: server/app/ai/gemini.py
 */

import { GoogleGenAI } from "@google/genai";

export class GeminiService {
  constructor() {
    this._client = null;
  }

  get model() {
    return process.env.GEMINI_MODEL || "gemini-3.5-flash";
  }

  get client() {
    if (!this._client) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (
        !apiKey ||
        ["YOUR_GEMINI_API_KEY", "your_gemini_api_key", ""].includes(String(apiKey).trim())
      ) {
        throw new Error(
          "GEMINI_API_KEY is not configured. Please set a valid GEMINI_API_KEY in server-node/.env file."
        );
      }
      this._client = new GoogleGenAI({ apiKey: String(apiKey).trim() });
    }
    return this._client;
  }

  /**
   * Generates a SQL query from natural language using Gemini.
   * @param {string} question
   * @param {object} schema
   * @returns {Promise<{ sql: string, explanation: string, confidence: number }>}
   */
  async generateSql(question, schema) {
    const schemaText = JSON.stringify(schema, null, 2);

    const prompt = `
You are QueryPilot, an AI SQL assistant.

Convert the user's natural-language question
into a SQL query using ONLY the provided database schema.

STRICT RULES:

1. Use ONLY tables present in the schema.
2. Use ONLY columns present in the schema.
3. NEVER invent a table.
4. NEVER invent a column.
5. Generate READ-ONLY SQL only.
6. Never use INSERT, UPDATE, DELETE, DROP,
   ALTER, CREATE, TRUNCATE, or other destructive SQL.
7. The SQL must be valid for the database type.
8. Give a short explanation.
9. Give a confidence score between 0 and 1.
10. Return ONLY valid JSON.

Expected JSON:

{
    "sql": "SELECT ...;",
    "explanation": "Short explanation.",
    "confidence": 0.95
}

DATABASE SCHEMA:

${schemaText}

USER QUESTION:

${question}
`;

    const response = await this.client.models.generateContent({
      model: this.model,
      contents: prompt,
    });

    let text = (response.text || "").trim();

    // Remove markdown code fences if present
    if (text.startsWith("```")) {
      text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    }

    let result;
    try {
      result = JSON.parse(text);
    } catch (err) {
      throw new Error("Gemini returned invalid JSON.");
    }

    const sql = result.sql;
    if (!sql) {
      throw new Error("Gemini did not return SQL.");
    }

    const explanation = result.explanation || "SQL query generated successfully.";

    let confidence = 0.5;
    if (result.confidence !== undefined && result.confidence !== null) {
      const parsed = parseFloat(result.confidence);
      if (!isNaN(parsed)) {
        confidence = Math.max(0.0, Math.min(1.0, parsed));
      }
    }

    return {
      sql: String(sql).trim(),
      explanation: String(explanation).trim(),
      confidence,
    };
  }
}
