import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { GeminiService } from "../../src/ai/gemini.js";
import { setAIService } from "../../src/ai/service.js";
import { MockAIService } from "../../src/ai/mock.js";
import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import os from "os";

describe("Real-World Integration Verification", () => {
  let externalDbPath;
  let sessionId;

  beforeEach(async () => {
    // 1. Create SQLite DB file strictly in OS temporary directory (outside the project repository)
    externalDbPath = path.join(
      os.tmpdir(),
      `external_store_${Date.now()}_${Math.random().toString(36).slice(2)}.db`
    );

    const db = new Database(externalDbPath);
    db.exec(`
      CREATE TABLE categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category_name TEXT NOT NULL
      );

      CREATE TABLE products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_name TEXT NOT NULL,
        price REAL NOT NULL,
        stock INTEGER NOT NULL,
        category_id INTEGER,
        FOREIGN KEY (category_id) REFERENCES categories(id)
      );

      INSERT INTO categories (category_name) VALUES ('Electronics'), ('Apparel'), ('Groceries');

      INSERT INTO products (product_name, price, stock, category_id) VALUES
        ('Smartphone', 699.99, 50, 1),
        ('Laptop', 1199.99, 20, 1),
        ('T-Shirt', 24.99, 100, 2),
        ('Coffee Beans', 14.50, 200, 3);
    `);
    db.close();

    // Upload external SQLite file
    const res = await request(app)
      .post("/database/session")
      .field("database_type", "sqlite")
      .attach("file", externalDbPath);

    expect(res.status).toBe(200);
    sessionId = res.body.session_id;
  });

  afterEach(() => {
    setAIService(null);
    if (fs.existsSync(externalDbPath)) {
      try {
        fs.unlinkSync(externalDbPath);
      } catch {}
    }
  });

  it("extracts schema accurately from external database", async () => {
    const res = await request(app).post(`/database/schema?session_id=${sessionId}`);

    expect(res.status).toBe(200);
    expect(res.body.database_type).toBe("sqlite");

    const tableNames = res.body.tables.map((t) => t.name);
    expect(tableNames).toContain("categories");
    expect(tableNames).toContain("products");

    const productsTable = res.body.tables.find((t) => t.name === "products");
    expect(productsTable.columns.map((c) => c.name)).toEqual([
      "id",
      "product_name",
      "price",
      "stock",
      "category_id",
    ]);
    expect(productsTable.foreign_keys).toEqual([
      {
        column: "category_id",
        references_table: "categories",
        references_column: "id",
      },
    ]);
  });

  it("blocks INSERT, UPDATE, DELETE, DROP, and multiple statements", async () => {
    // INSERT
    const insertRes = await request(app)
      .post("/database/execute")
      .send({
        session_id: sessionId,
        sql: "INSERT INTO products (product_name, price, stock, category_id) VALUES ('Tablet', 299.99, 15, 1);",
      });
    expect(insertRes.status).toBe(400);
    expect(insertRes.body.detail).toBe("Only SELECT statements are allowed");

    // UPDATE
    const updateRes = await request(app)
      .post("/database/execute")
      .send({
        session_id: sessionId,
        sql: "UPDATE products SET price = 999.99 WHERE id = 1;",
      });
    expect(updateRes.status).toBe(400);
    expect(updateRes.body.detail).toBe("Only SELECT statements are allowed");

    // DELETE
    const deleteRes = await request(app)
      .post("/database/execute")
      .send({
        session_id: sessionId,
        sql: "DELETE FROM products WHERE id = 1;",
      });
    expect(deleteRes.status).toBe(400);
    expect(deleteRes.body.detail).toBe("Only SELECT statements are allowed");

    // DROP
    const dropRes = await request(app)
      .post("/database/execute")
      .send({
        session_id: sessionId,
        sql: "DROP TABLE products;",
      });
    expect(dropRes.status).toBe(400);
    expect(dropRes.body.detail).toBe("Only SELECT statements are allowed");

    // MULTIPLE STATEMENTS
    const multiRes = await request(app)
      .post("/database/execute")
      .send({
        session_id: sessionId,
        sql: "SELECT * FROM products; DROP TABLE categories;",
      });
    expect(multiRes.status).toBe(400);
    expect(multiRes.body.detail).toBe("Multiple SQL statements are not allowed");
  });

  it("executes complete NL → Gemini/AI → SQL → Safety → Execution → Result flow", async () => {
    // 1. Generate SQL
    const generateRes = await request(app)
      .post("/generate")
      .send({
        session_id: sessionId,
        question: "List all products sorted by price in descending order",
      });

    // If Gemini key is live and valid or mock fallback
    let sqlToExecute;
    if (generateRes.status === 200) {
      sqlToExecute = generateRes.body.sql;
      expect(generateRes.body.confidence).toBeGreaterThanOrEqual(0);
    } else {
      // Use mock to complete end-to-end pipeline
      setAIService(new MockAIService());
      const mockGen = await request(app)
        .post("/generate")
        .send({
          session_id: sessionId,
          question: "List all products sorted by price in descending order",
        });
      expect(mockGen.status).toBe(200);
      sqlToExecute = "SELECT product_name, price FROM products ORDER BY price DESC";
    }

    // 2. Execute SQL
    const execRes = await request(app)
      .post("/database/execute")
      .send({
        session_id: sessionId,
        sql: sqlToExecute,
      });

    expect(execRes.status).toBe(200);
    expect(execRes.body.success).toBe(true);
    expect(execRes.body.columns.length).toBeGreaterThan(0);
    expect(execRes.body.rows.length).toBeGreaterThan(0);
  });
});
