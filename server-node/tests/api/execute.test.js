import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import os from "os";

describe("POST /database/execute", () => {
  let tmpDbPath;
  let sessionId;

  beforeEach(async () => {
    tmpDbPath = path.join(
      os.tmpdir(),
      `test_api_exec_${Date.now()}_${Math.random().toString(36).slice(2)}.db`
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
    if (fs.existsSync(tmpDbPath)) {
      try {
        fs.unlinkSync(tmpDbPath);
      } catch {}
    }
  });

  it("executes valid SELECT query and returns rows", async () => {
    const res = await request(app)
      .post("/database/execute")
      .send({
        session_id: sessionId,
        sql: "SELECT name, salary FROM employees ORDER BY salary DESC",
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.columns).toEqual(["name", "salary"]);
    expect(res.body.rows).toEqual([
      ["Priya", 1500000],
      ["Amit", 1200000],
      ["Rahul", 1000000],
    ]);
  });

  it("blocks non-SELECT query with 400", async () => {
    const res = await request(app)
      .post("/database/execute")
      .send({
        session_id: sessionId,
        sql: "DELETE FROM employees WHERE id = 1;",
      });

    expect(res.status).toBe(400);
    expect(res.body.detail).toBe("Only SELECT statements are allowed");
  });

  it("returns 404 for non-existent session", async () => {
    const res = await request(app)
      .post("/database/execute")
      .send({
        session_id: "non-existent-session",
        sql: "SELECT 1;",
      });

    expect(res.status).toBe(404);
    expect(res.body.detail).toBe("Database session not found");
  });
});
