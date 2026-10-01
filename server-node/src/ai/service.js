/**
 * service.js
 *
 * Provider and dependency injection for the AI Service.
 * Mirrors Python: server/app/ai/service.py & server/app/api/routes/generate.py get_ai_service
 */

import { GeminiService } from "./gemini.js";

let currentAIService = null;

/**
 * Returns the active AI service instance.
 * @returns {GeminiService | import("./mock.js").MockAIService}
 */
export function getAIService() {
  if (!currentAIService) {
    currentAIService = new GeminiService();
  }
  return currentAIService;
}

/**
 * Override the AI service (used in tests with MockAIService).
 * @param {object | null} service
 */
export function setAIService(service) {
  currentAIService = service;
}
