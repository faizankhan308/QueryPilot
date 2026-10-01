/**
 * postgres.js
 *
 * PostgreSQL database adapter using pg (node-postgres).
 * Mirrors Python: server/app/database/postgres.py
 */

import pg from "pg";
import { DatabaseAdapter } from "./base.js";
import { DatabaseConnectionError } from "../exceptions.js";

const { Pool } = pg;

export class PostgreSQLAdapter extends DatabaseAdapter {
  /**
   * @param {string} connectionUrl - PostgreSQL connection URL.
   */
  constructor(connectionUrl) {
    super();
    this.connectionUrl = connectionUrl;
    this.pool = null;
  }

  /**
   * Helper to build pool configuration with SSL support for remote/cloud databases.
   */
  _getPoolConfig() {
    const isRemote =
      this.connectionUrl.includes("supabase.co") ||
      this.connectionUrl.includes("pooler.supabase.com") ||
      this.connectionUrl.includes("neon.tech") ||
      this.connectionUrl.includes("sslmode=require") ||
      (!this.connectionUrl.includes("localhost") && !this.connectionUrl.includes("127.0.0.1"));

    const poolConfig = {
      connectionString: this.connectionUrl,
      idleTimeoutMillis: 300000,
      connectionTimeoutMillis: 10000,
    };

    if (isRemote) {
      poolConfig.ssl = { rejectUnauthorized: false };
    }

    return poolConfig;
  }

  /**
   * Connect to PostgreSQL and verify connectivity.
   * @returns {Promise<boolean>}
   */
  async connect() {
    try {
      this.pool = new Pool(this._getPoolConfig());

      const client = await this.pool.connect();
      try {
        await client.query("SELECT 1");
      } finally {
        client.release();
      }

      return true;
    } catch (err) {
      this.pool = null;

      // Mask password for logging
      const safeUrl = this.connectionUrl.replace(/:([^:@]+)@/, ":****@");
      console.error("POSTGRES ERROR:", `Failed to connect to ${safeUrl}`, err);

      throw new DatabaseConnectionError(`Unable to connect to PostgreSQL database: ${err.message}`);
    }
  }

  /**
   * Introspect PostgreSQL schema for public tables, columns, and foreign keys.
   * @returns {Promise<object>} DatabaseSchema
   */
  async getSchema() {
    if (!this.pool) {
      await this.connect();
    }

    const client = await this.pool.connect();
    try {
      // 1. Get base tables in public schema
      const tablesResult = await client.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_type = 'BASE TABLE'
        ORDER BY table_name;
      `);

      const tableNames = tablesResult.rows.map((r) => r.table_name);

      // 2. Get primary keys
      const pkResult = await client.query(`
        SELECT kcu.table_name, kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        WHERE tc.constraint_type = 'PRIMARY KEY'
          AND tc.table_schema = 'public';
      `);

      const pkSet = new Set(
        pkResult.rows.map((r) => `${r.table_name}.${r.column_name}`)
      );

      // 3. Get columns
      const colResult = await client.query(`
        SELECT table_name, column_name, data_type, udt_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
        ORDER BY table_name, ordinal_position;
      `);

      const columnsByTable = {};
      for (const col of colResult.rows) {
        if (!columnsByTable[col.table_name]) {
          columnsByTable[col.table_name] = [];
        }
        columnsByTable[col.table_name].push({
          name: col.column_name,
          type: (col.udt_name || col.data_type || "VARCHAR").toUpperCase(),
          primary_key: pkSet.has(`${col.table_name}.${col.column_name}`),
        });
      }

      // 4. Get foreign keys
      const fkResult = await client.query(`
        SELECT
          kcu.table_name AS source_table,
          kcu.column_name AS source_column,
          ccu.table_name AS target_table,
          ccu.column_name AS target_column
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema = 'public';
      `);

      const fksByTable = {};
      for (const fk of fkResult.rows) {
        if (!fksByTable[fk.source_table]) {
          fksByTable[fk.source_table] = [];
        }
        fksByTable[fk.source_table].push({
          column: fk.source_column,
          references_table: fk.target_table,
          references_column: fk.target_column,
        });
      }

      const tables = tableNames.map((tableName) => ({
        name: tableName,
        columns: columnsByTable[tableName] || [],
        foreign_keys: fksByTable[tableName] || [],
      }));

      return {
        database_type: "postgresql",
        tables,
      };
    } finally {
      client.release();
    }
  }

  /**
   * Execute read-only SQL query against PostgreSQL.
   * @param {string} sql
   * @returns {Promise<{ columns: string[], rows: any[][] }>}
   */
  async executeQuery(sql) {
    if (!this.pool) {
      throw new Error("Database is not connected");
    }

    const result = await this.pool.query(sql);

    const columns = (result.fields || []).map((f) => f.name);
    const rows = (result.rows || []).map((row) => Object.values(row));

    return {
      columns,
      rows,
    };
  }

  /**
   * Close the PostgreSQL connection pool.
   */
  async close() {
    if (this.pool) {
      try {
        await this.pool.end();
      } catch (err) {
        // Ignore close errors
      }
      this.pool = null;
    }
  }
}
