/**
 * mock.js
 *
 * Mock AI Service for testing without hitting external APIs.
 * Mirrors Python: server/app/ai/mock.py
 */

export class MockAIService {
  /**
   * Generates a deterministic mock SQL response.
   * @param {string} question
   * @param {object} schema
   * @returns {Promise<{ sql: string, explanation: string, confidence: number }>}
   */
  async generateSql(question, schema) {
    return {
      sql: "SELECT name, salary FROM employees ORDER BY salary DESC;",
      explanation: "Retrieves employees and sorts them by salary from highest to lowest.",
      confidence: 0.95,
    };
  }
}
