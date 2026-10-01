/**
 * schema.js  —  Zod schemas for the database schema response shape.
 *
 * Mirrors Python:  server/app/models/schema.py
 *
 *   class ColumnSchema      → ColumnSchema
 *   class ForeignKeySchema  → ForeignKeySchema
 *   class TableSchema       → TableSchema
 *   class DatabaseSchema    → DatabaseSchema
 *
 * This shape is consumed by the React SchemaExplorer sidebar component.
 * Any deviation from this exact structure will break the frontend.
 */

import { z } from "zod";

// ─── Column ───────────────────────────────────────────────────────────────────

export const ColumnSchema = z.object({
  name: z.string(),
  type: z.string(),
  primary_key: z.boolean(),
});

// ─── Foreign key ──────────────────────────────────────────────────────────────

export const ForeignKeySchema = z.object({
  column: z.string(),
  references_table: z.string(),
  references_column: z.string(),
});

// ─── Table ────────────────────────────────────────────────────────────────────

export const TableSchema = z.object({
  name: z.string(),
  columns: z.array(ColumnSchema),
  foreign_keys: z.array(ForeignKeySchema),
});

// ─── Database schema  (root response for POST /database/schema) ───────────────

export const DatabaseSchema = z.object({
  database_type: z.string(),
  tables: z.array(TableSchema),
});
