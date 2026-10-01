/**
 * safety.js
 *
 * Validates that a given SQL query is a single, read-only SELECT statement.
 * Mirrors Python: server/app/database/safety.py
 */

import pkg from "node-sql-parser";
import { UnsafeQueryError } from "./exceptions.js";

const { Parser } = pkg;
const parser = new Parser();

/**
 * Ensures the given SQL is a single, read-only SELECT statement.
 * Throws UnsafeQueryError if it is not.
 *
 * @param {string} sql - The SQL string to validate.
 * @throws {UnsafeQueryError}
 */
export function validateReadOnlySql(sql) {
  if (!sql || typeof sql !== "string" || !sql.trim()) {
    throw new UnsafeQueryError("Empty SQL query");
  }

  let ast;
  try {
    ast = parser.astify(sql.trim());
  } catch (err) {
    throw new UnsafeQueryError("Unable to parse SQL query");
  }

  if (!ast || (Array.isArray(ast) && ast.length === 0)) {
    throw new UnsafeQueryError("Empty SQL query");
  }

  const statements = Array.isArray(ast) ? ast : [ast];

  if (statements.length > 1) {
    throw new UnsafeQueryError("Multiple SQL statements are not allowed");
  }

  const statement = statements[0];

  if (!statement || statement.type !== "select") {
    throw new UnsafeQueryError("Only SELECT statements are allowed");
  }

  // Also check if SELECT INTO is used (which writes to a new table)
  if (statement.into && statement.into.position) {
    throw new UnsafeQueryError("Only SELECT statements are allowed");
  }
}
