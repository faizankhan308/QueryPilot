/**
 * session.js  —  Zod schemas for database session request/response shapes.
 *
 * Mirrors Python:  server/app/models/session.py
 *
 *   class DatabaseSession   → DatabaseSessionSchema
 *   class QueryRequest      → QueryRequestSchema
 *   class QueryResponse     → QueryResponseSchema
 */

import { z } from "zod";

// ─── POST /database/session  (response) ──────────────────────────────────────

export const DatabaseSessionSchema = z.object({
  session_id: z.string().trim().min(1),
  database_type: z.string().trim().min(1),
});

// ─── POST /database/execute  (request body) ──────────────────────────────────

export const QueryRequestSchema = z.object({
  session_id: z.string().trim().min(1, "session_id is required"),
  sql: z.string().trim().min(1, "sql is required"),
});

// ─── POST /database/execute  (response) ──────────────────────────────────────

export const QueryResponseSchema = z.object({
  success: z.boolean(),
  columns: z.array(z.string()),
  // Each row is an array of any serialisable values (matches Python list[list])
  rows: z.array(z.array(z.unknown())),
});
