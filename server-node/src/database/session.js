/**
 * session.js
 *
 * In-memory database session manager.
 * Mirrors Python: server/app/database/session.py
 */

import { randomUUID } from "crypto";

export class DatabaseSessionManager {
  constructor() {
    this._sessions = new Map();
  }

  /**
   * Register a database adapter and return a new session ID.
   * @param {import("./adapters/base.js").DatabaseAdapter} adapter
   * @returns {string} sessionId
   */
  createSession(adapter) {
    const sessionId = randomUUID();
    this._sessions.set(sessionId, adapter);
    return sessionId;
  }

  /**
   * Retrieve an active database adapter by session ID.
   * @param {string} sessionId
   * @returns {import("./adapters/base.js").DatabaseAdapter}
   * @throws {Error} if session is not found
   */
  getSession(sessionId) {
    if (!this._sessions.has(sessionId)) {
      throw new Error(`Unknown database session: ${sessionId}`);
    }
    return this._sessions.get(sessionId);
  }

  /**
   * Close and delete an active session.
   * @param {string} sessionId
   */
  async closeSession(sessionId) {
    const adapter = this._sessions.get(sessionId);
    if (adapter) {
      this._sessions.delete(sessionId);
      try {
        await Promise.resolve(adapter.close());
      } catch (err) {
        // Ignore close errors
      }
    }
  }

  /**
   * Remove and close all sessions (useful for tests).
   */
  async clear() {
    for (const [id, adapter] of this._sessions.entries()) {
      try {
        await Promise.resolve(adapter.close());
      } catch (err) {
        // Ignore close errors
      }
    }
    this._sessions.clear();
  }
}
