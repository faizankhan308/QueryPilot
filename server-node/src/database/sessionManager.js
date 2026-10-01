/**
 * sessionManager.js
 *
 * Singleton instance of DatabaseSessionManager.
 * Mirrors Python: server/app/database/session_manager.py
 */

import { DatabaseSessionManager } from "./session.js";

export const sessionManager = new DatabaseSessionManager();
