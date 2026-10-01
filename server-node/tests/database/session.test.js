import { describe, it, expect, beforeEach } from "vitest";
import { DatabaseSessionManager } from "../../src/database/session.js";

class MockAdapter {
  constructor() {
    this.closed = false;
  }
  close() {
    this.closed = true;
  }
}

describe("DatabaseSessionManager", () => {
  let manager;

  beforeEach(() => {
    manager = new DatabaseSessionManager();
  });

  it("creates and retrieves sessions", () => {
    const adapter = new MockAdapter();
    const sessionId = manager.createSession(adapter);

    expect(sessionId).toBeTypeOf("string");
    expect(sessionId.length).toBeGreaterThan(0);

    const retrieved = manager.getSession(sessionId);
    expect(retrieved).toBe(adapter);
  });

  it("throws error for non-existent session", () => {
    expect(() => manager.getSession("non-existent")).toThrow(
      "Unknown database session: non-existent"
    );
  });

  it("closes and removes session", async () => {
    const adapter = new MockAdapter();
    const sessionId = manager.createSession(adapter);

    await manager.closeSession(sessionId);
    expect(adapter.closed).toBe(true);
    expect(() => manager.getSession(sessionId)).toThrow();
  });
});
