/**
 * base.js
 *
 * Abstract base class for database adapters.
 * Mirrors Python: server/app/database/base.py
 */

export class DatabaseAdapter {
  /**
   * Connect to the database and verify connectivity.
   * @returns {Promise<boolean> | boolean}
   */
  connect() {
    throw new Error("connect() must be implemented by subclass");
  }

  /**
   * Introspect and return the database schema.
   * @returns {Promise<object> | object}
   */
  getSchema() {
    throw new Error("getSchema() must be implemented by subclass");
  }

  /**
   * Execute a read-only SQL query and return { columns, rows }.
   * @param {string} sql
   * @returns {Promise<{ columns: string[], rows: any[][] }> | { columns: string[], rows: any[][] }}
   */
  executeQuery(sql) {
    throw new Error("executeQuery() must be implemented by subclass");
  }

  /**
   * Close the database connection and release resources.
   * @returns {Promise<void> | void}
   */
  close() {
    throw new Error("close() must be implemented by subclass");
  }
}
