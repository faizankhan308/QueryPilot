/**
 * generate.js  —  Zod schemas for the AI generation request/response.
 *
 * Mirrors Python:  server/app/models/generate.py
 *
 *   class GenerateRequest   → GenerateRequestSchema
 *   class GenerateResponse  → GenerateResponseSchema
 */

import { z } from "zod";

// ─── POST /generate  (request body) ──────────────────────────────────────────

export const GenerateRequestSchema = z.object({
  session_id: z.string().trim().min(1, "session_id is required"),
  question: z.string().trim().min(1, "question is required"),
});

// ─── POST /generate  (response) ──────────────────────────────────────────────

export const GenerateResponseSchema = z.object({
  sql: z.string(),
  explanation: z.string(),
  // Mirrors:  confidence: float  (Python clamps to [0.0, 1.0])
  confidence: z.number().min(0).max(1),
});
