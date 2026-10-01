/**
 * exceptions.js
 *
 * Custom error classes for database operations.
 * Mirrors Python:  server/app/database/exceptions.py
 *
 *   class DatabaseConnectionError  →  DatabaseConnectionError
 *   class UnsafeQueryError         →  UnsafeQueryError
 */

export class DatabaseConnectionError extends Error {
  constructor(message) {
    super(message);
    this.name = "DatabaseConnectionError";
  }
}

export class UnsafeQueryError extends Error {
  constructor(message) {
    super(message);
    this.name = "UnsafeQueryError";
  }
}
