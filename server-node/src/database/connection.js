/**
 * connection.js
 *
 * Factory for creating DatabaseAdapter instances from DatabaseConfig.
 * Mirrors Python: server/app/database/connection.py
 */

import { SQLiteAdapter } from "./adapters/sqlite.js";
import { PostgreSQLAdapter } from "./adapters/postgres.js";

/**
 * Creates and returns the appropriate DatabaseAdapter based on config.
 * @param {{ database_type: "sqlite" | "postgresql", connection_url: string }} config
 * @returns {SQLiteAdapter | PostgreSQLAdapter}
 */
export function createDatabaseAdapter(config) {
  if (config.database_type === "sqlite") {
    return new SQLiteAdapter(config.connection_url);
  }

  if (config.database_type === "postgresql") {
    return new PostgreSQLAdapter(config.connection_url);
  }

  throw new Error(`Unsupported database type: ${config.database_type}`);
}
