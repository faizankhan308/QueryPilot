import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import os from "os";

describe("POST /database/session", () => {
  let tmpDbPath;

  beforeEach(() => {
    tmpDbPath = path.join(
      os.tmpdir(),
      `test_api_session_${Date.now()}_${Math.random().toString(36).slice(2)}.db`
    );
    const db = new Database(tmpDbPath);
    db.exec("CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT);");
    db.close();
  });

  afterEach(() => {
    if (fs.existsSync(tmpDbPath)) {
      try {
        fs.unlinkSync(tmpDbPath);
      } catch {}
    }
  });

  it("creates a valid SQLite session with file upload", async () => {
    const res = await request(app)
      .post("/database/session")
      .field("database_type", "sqlite")
      .attach("file", tmpDbPath);

    expect(res.status).toBe(200);
    expect(res.body.session_id).toBeTypeOf("string");
    expect(res.body.database_type).toBe("sqlite");
  });

  it("rejects SQLite session without a file", async () => {
    const res = await request(app)
      .post("/database/session")
      .field("database_type", "sqlite");

    expect(res.status).toBe(400);
    expect(res.body.detail).toBe("SQLite database file is required");
  });

  it("rejects invalid file extension for SQLite", async () => {
    const invalidFile = path.join(os.tmpdir(), "invalid.txt");
    fs.writeFileSync(invalidFile, "not a db");

    try {
      const res = await request(app)
        .post("/database/session")
        .field("database_type", "sqlite")
        .attach("file", invalidFile);

      expect(res.status).toBe(400);
      expect(res.body.detail).toBe("Unsupported SQLite file type");
    } finally {
      if (fs.existsSync(invalidFile)) {
        fs.unlinkSync(invalidFile);
      }
    }
  });

  it("rejects PostgreSQL session without connection URL", async () => {
    const res = await request(app)
      .post("/database/session")
      .field("database_type", "postgresql");

    expect(res.status).toBe(400);
    expect(res.body.detail).toBe("PostgreSQL connection URL is required");
  });

  it("rejects unsupported database type", async () => {
    const res = await request(app)
      .post("/database/session")
      .field("database_type", "mongodb");

    expect(res.status).toBe(400);
    expect(res.body.detail).toBe("Unsupported database type");
  });
});
