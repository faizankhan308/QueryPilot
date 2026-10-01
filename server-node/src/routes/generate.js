/**
 * generate.js
 *
 * Route for AI-powered SQL generation.
 * Mirrors Python: server/app/api/routes/generate.py
 */

import express from "express";
import { sessionManager } from "../database/sessionManager.js";
import { getAIService } from "../ai/service.js";
import { GenerateRequestSchema } from "../schemas/generate.js";

const router = express.Router();

/**
 * POST /generate
 * Generates SQL from natural language query using AI service and session schema.
 */
router.post("", async (req, res, next) => {
  try {
    const validation = GenerateRequestSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        detail: validation.error.issues[0]?.message || "Invalid generate request",
      });
    }

    const { session_id: sessionId, question } = validation.data;

    let db;
    try {
      db = sessionManager.getSession(sessionId);
    } catch (err) {
      return res.status(404).json({ detail: "Database session not found" });
    }

    const schema = await Promise.resolve(db.getSchema());
    const aiService = getAIService();

    let result;
    try {
      result = await aiService.generateSql(question, schema);
    } catch (err) {
      return res.status(400).json({ detail: err.message || "Failed to generate SQL" });
    }

    return res.status(200).json({
      sql: result.sql,
      explanation: result.explanation,
      confidence: result.confidence,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
