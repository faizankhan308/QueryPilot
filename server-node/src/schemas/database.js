/**
 * database.js  —  Zod schema for internal database config.
 *
 * Mirrors Python:  server/app/models/database.py
 *
 *   class DatabaseConfig  → DatabaseConfigSchema
 *
 * Used internally by the connection factory (Step 4+), not exposed directly
 * to the HTTP layer (the session route uses FormData, validated in the route
 * handler via the session schemas).
 */

import { z } from "zod";

export const DatabaseConfigSchema = z.object({
  database_type: z.enum(["sqlite", "postgresql"], {
    errorMap: () => ({
      message: "database_type must be 'sqlite' or 'postgresql'",
    }),
  }),
  // For SQLite this will be a filesystem path; for PostgreSQL a connection URL.
  connection_url: z.string().min(1, "connection_url is required"),
});
