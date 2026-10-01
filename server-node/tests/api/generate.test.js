import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { setAIService } from "../../src/ai/service.js";
import { MockAIService } from "../../src/ai/mock.js";
import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import os from "os";

describe("POST /generate", () => {
  let tmpDbPath;
  let sessionId;

  beforeEach(async () => {
    // Inject MockAIService for tests
    setAIService(new MockAIService());

    tmpDbPath = path.join(
      os.tmpdir(),
      `test_api_gen_${Date.now()}_${Math.random().toString(36).slice(2)}.db`
    );
    const db = new Database(tmpDbPath);
    db.exec(`
      CREATE TABLE employees (id INTEGER PRIMARY KEY, name TEXT NOT NULL, salary INTEGER NOT NULL);
      INSERT INTO employees (name, salary) VALUES ('Rahul', 1000000), ('Amit', 1200000), ('Priya', 1500000);
    `);
    db.close();

    const res = await request(app)
      .post("/database/session")
      .field("database_type", "sqlite")
      .attach("file", tmpDbPath);

    sessionId = res.body.session_id;
  });

  afterEach(() => {
    setAIService(null);
    if (fs.existsSync(tmpDbPath)) {
      try {
        fs.unlinkSync(tmpDbPath);
      } catch {}
    }
  });

  it("generates SQL successfully from question and schema", async () => {
    const res = await request(app)
      .post("/generate")
      .send({
        session_id: sessionId,
        question: "Show the highest paid employees",
      });

    expect(res.status).toBe(200);
    expect(res.body.sql).toBe(
      "SELECT name, salary FROM employees ORDER BY salary DESC;"
    );
    expect(res.body.explanation).toBeTypeOf("string");
    expect(res.body.confidence).toBeGreaterThanOrEqual(0);
    expect(res.body.confidence).toBeLessThanOrEqual(1);
  });

  it("returns 404 for non-existent session", async () => {
    const res = await request(app)
      .post("/generate")
      .send({
        session_id: "non-existent-session-id",
        question: "Show employees",
      });

    expect(res.status).toBe(404);
    expect(res.body.detail).toBe("Database session not found");
  });

  it("returns 400 when question is empty", async () => {
    const res = await request(app)
      .post("/generate")
      .send({
        session_id: sessionId,
        question: "   ",
      });

    expect(res.status).toBe(400);
  });
});
