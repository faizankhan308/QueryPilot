import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import os from "os";

describe("POST /database/schema", () => {
  let tmpDbPath;
  let sessionId;

  beforeEach(async () => {
    tmpDbPath = path.join(
      os.tmpdir(),
      `test_api_schema_${Date.now()}_${Math.random().toString(36).slice(2)}.db`
    );
    const db = new Database(tmpDbPath);
    db.exec(`
      CREATE TABLE departments (id INTEGER PRIMARY KEY, name TEXT NOT NULL);
      CREATE TABLE employees (id INTEGER PRIMARY KEY, name TEXT, department_id INTEGER, FOREIGN KEY(department_id) REFERENCES departments(id));
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

  it("retrieves schema using query parameter", async () => {
    const res = await request(app).post(`/database/schema?session_id=${sessionId}`);

    expect(res.status).toBe(200);
    expect(res.body.database_type).toBe("sqlite");
    expect(res.body.tables.length).toBe(2);

    const tableNames = res.body.tables.map((t) => t.name);
    expect(tableNames).toContain("departments");
    expect(tableNames).toContain("employees");
  });

  it("retrieves schema using request body", async () => {
    const res = await request(app)
      .post("/database/schema")
      .send({ session_id: sessionId });

    expect(res.status).toBe(200);
    expect(res.body.database_type).toBe("sqlite");
    expect(res.body.tables.length).toBe(2);
  });

  it("returns 404 for non-existent session", async () => {
    const res = await request(app).post(
      "/database/schema?session_id=00000000-0000-0000-0000-000000000000"
    );

    expect(res.status).toBe(404);
    expect(res.body.detail).toBe("Database session not found");
  });

  it("returns 400 when session_id is missing", async () => {
    const res = await request(app).post("/database/schema");

    expect(res.status).toBe(400);
    expect(res.body.detail).toBe("session_id is required");
  });
});
