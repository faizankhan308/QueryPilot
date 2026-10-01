/**
 * sqlite.js
 *
 * SQLite database adapter using better-sqlite3.
 * Mirrors Python: server/app/database/sqlite.py
 */

import Database from "better-sqlite3";
import { DatabaseAdapter } from "./base.js";
import { DatabaseConnectionError } from "../exceptions.js";

export class SQLiteAdapter extends DatabaseAdapter {
  /**
   * @param {string} databasePath - Path to the SQLite database file.
   */
  constructor(databasePath) {
    super();
    this.databasePath = databasePath;
    this.db = null;
  }

  /**
   * Connect to the SQLite database and test connectivity.
   * @returns {boolean}
   */
  connect() {
    try {
      this.db = new Database(this.databasePath, {
        fileMustExist: false,
      });

      // Verify connection
      this.db.prepare("SELECT 1").get();
      return true;
    } catch (err) {
      this.db = null;
      throw new DatabaseConnectionError("Unable to connect to SQLite database");
    }
  }

  /**
   * Introspects tables, columns, and foreign keys.
   * @returns {object} DatabaseSchema object
   */
  getSchema() {
    if (!this.db) {
      this.connect();
    }

    const tables = [];
    const tableRows = this.db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
      )
      .all();

    for (const tableRow of tableRows) {
      const tableName = tableRow.name;

      // Columns
      // PRAGMA table_info returns { cid, name, type, notnull, dflt_value, pk }
      const columnRows = this.db.prepare(`PRAGMA table_info("${tableName}")`).all();
      const columns = columnRows.map((col) => ({
        name: col.name,
        type: col.type ? String(col.type).toUpperCase() : "TEXT",
        primary_key: Boolean(col.pk),
      }));

      // Foreign Keys
      // PRAGMA foreign_key_list returns { id, seq, table, from, to, on_update, on_delete, match }
      const fkRows = this.db.prepare(`PRAGMA foreign_key_list("${tableName}")`).all();
      const foreignKeys = fkRows.map((fk) => ({
        column: fk.from,
        references_table: fk.table,
        references_column: fk.to,
      }));

      tables.push({
        name: tableName,
        columns,
        foreign_keys: foreignKeys,
      });
    }

    return {
      database_type: "sqlite",
      tables,
    };
  }

  /**
   * Execute a read-only SQL query.
   * @param {string} sql
   * @returns {{ columns: string[], rows: any[][] }}
   */
  executeQuery(sql) {
    if (!this.db) {
      throw new Error("Database is not connected");
    }

    const stmt = this.db.prepare(sql);
    const rawRows = stmt.all();

    let columns = [];
    if (typeof stmt.columns === "function") {
      const colDefs = stmt.columns();
      if (colDefs && colDefs.length > 0) {
        columns = colDefs.map((c) => c.name);
      }
    }

    if (columns.length === 0 && rawRows.length > 0) {
      columns = Object.keys(rawRows[0]);
    }

    const rows = rawRows.map((row) => Object.values(row));

    return {
      columns,
      rows,
    };
  }

  /**
   * Close the database connection.
   */
  close() {
    if (this.db) {
      try {
        this.db.close();
      } catch (err) {
        // Ignore close errors
      }
      this.db = null;
    }
  }
}
