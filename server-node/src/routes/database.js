/**
 * database.js
 *
 * Database routes: session creation, schema introspection, query execution.
 * Mirrors Python: server/app/api/routes/database.py
 */

import express from "express";
import multer from "multer";
import os from "os";
import path from "path";
import fs from "fs";
import { createDatabaseAdapter } from "../database/connection.js";
import { sessionManager } from "../database/sessionManager.js";
import { validateReadOnlySql } from "../database/safety.js";
import { DatabaseConnectionError, UnsafeQueryError } from "../database/exceptions.js";
import { QueryRequestSchema } from "../schemas/session.js";

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  dest: path.join(os.tmpdir(), "querypilot-uploads"),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB
  },
});

/**
 * POST /database/session
 * Creates a new database session (supports SQLite file upload or PostgreSQL connection string).
 */
router.post("/session", upload.single("file"), async (req, res, next) => {
  try {
    const databaseType = req.body?.database_type;
    let connectionUrl = req.body?.connection_url;
    const file = req.file;

    if (!databaseType) {
      return res.status(400).json({ detail: "database_type is required" });
    }

    if (databaseType === "sqlite") {
      if (!file && !connectionUrl) {
        return res.status(400).json({ detail: "SQLite database file is required" });
      }

      if (file) {
        const ext = path.extname(file.originalname || "").toLowerCase();
        if (![".db", ".sqlite", ".sqlite3"].includes(ext)) {
          // Clean up uploaded file
          try {
            fs.unlinkSync(file.path);
          } catch {}
          return res.status(400).json({ detail: "Unsupported SQLite file type" });
        }

        // Give the file its original extension so SQLite driver handles it properly
        const targetPath = `${file.path}${ext}`;
        fs.renameSync(file.path, targetPath);
        connectionUrl = targetPath;
      }
    } else if (databaseType === "postgresql") {
      if (!connectionUrl || !String(connectionUrl).trim()) {
        return res.status(400).json({ detail: "PostgreSQL connection URL is required" });
      }
      connectionUrl = String(connectionUrl).trim();
    } else {
      return res.status(400).json({ detail: "Unsupported database type" });
    }

    const config = {
      database_type: databaseType,
      connection_url: connectionUrl,
    };

    const db = createDatabaseAdapter(config);

    try {
      await Promise.resolve(db.connect());
    } catch (err) {
      try {
        await Promise.resolve(db.close());
      } catch {}

      if (err instanceof DatabaseConnectionError) {
        return res.status(503).json({ detail: err.message });
      }
      return res.status(503).json({ detail: err.message || "Database connection failed" });
    }

    const sessionId = sessionManager.createSession(db);

    return res.status(200).json({
      session_id: sessionId,
      database_type: databaseType,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /database/schema
 * Returns the introspected schema for an active session.
 */
router.post("/schema", async (req, res, next) => {
  try {
    const sessionId = req.query.session_id || req.body?.session_id;

    if (!sessionId) {
      return res.status(400).json({ detail: "session_id is required" });
    }

    let db;
    try {
      db = sessionManager.getSession(String(sessionId));
    } catch (err) {
      return res.status(404).json({ detail: "Database session not found" });
    }

    const schema = await Promise.resolve(db.getSchema());
    return res.status(200).json(schema);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /database/execute
 * Executes a validated read-only SQL query against the session database.
 */
router.post("/execute", async (req, res, next) => {
  try {
    const validation = QueryRequestSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        detail: validation.error.issues[0]?.message || "Invalid query request",
      });
    }

    const { session_id: sessionId, sql } = validation.data;

    let db;
    try {
      db = sessionManager.getSession(sessionId);
    } catch (err) {
      return res.status(404).json({ detail: "Database session not found" });
    }

    try {
      validateReadOnlySql(sql);
    } catch (err) {
      if (err instanceof UnsafeQueryError) {
        return res.status(400).json({ detail: err.message });
      }
      return res.status(400).json({ detail: "Invalid SQL query" });
    }

    const result = await Promise.resolve(db.executeQuery(sql));

    return res.status(200).json({
      success: true,
      columns: result.columns,
      rows: result.rows,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
