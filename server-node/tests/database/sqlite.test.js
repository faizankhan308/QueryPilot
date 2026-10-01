import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { SQLiteAdapter } from "../../src/database/adapters/sqlite.js";
import { DatabaseConnectionError } from "../../src/database/exceptions.js";
import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import os from "os";

describe("SQLiteAdapter", () => {
  let tmpDbPath;
  let adapter;

  beforeEach(() => {
    tmpDbPath = path.join(os.tmpdir(), `test_querypilot_${Date.now()}_${Math.random().toString(36).slice(2)}.db`);
    const setupDb = new Database(tmpDbPath);

    setupDb.exec(`
      CREATE TABLE departments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL
      );

      CREATE TABLE employees (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        salary INTEGER NOT NULL,
        department_id INTEGER,
        FOREIGN KEY (department_id) REFERENCES departments(id)
      );

      INSERT INTO departments (name) VALUES ('Engineering'), ('HR'), ('Finance');

      INSERT INTO employees (name, salary, department_id) VALUES
        ('Rahul', 1000000, 1),
        ('Amit', 1200000, 1),
        ('Priya', 1500000, 2);
    `);

    setupDb.close();
    adapter = new SQLiteAdapter(tmpDbPath);
  });

  afterEach(() => {
    if (adapter) {
      adapter.close();
    }
    if (fs.existsSync(tmpDbPath)) {
      try {
        fs.unlinkSync(tmpDbPath);
      } catch {}
    }
  });

  it("connects successfully", () => {
    const connected = adapter.connect();
    expect(connected).toBe(true);
  });

  it("extracts schema with tables, columns, and foreign keys", () => {
    const schema = adapter.getSchema();

    expect(schema.database_type).toBe("sqlite");
    expect(schema.tables.length).toBe(2);

    const tableNames = schema.tables.map((t) => t.name);
    expect(tableNames).toContain("departments");
    expect(tableNames).toContain("employees");

    const empTable = schema.tables.find((t) => t.name === "employees");
    expect(empTable).toBeDefined();
    expect(empTable.columns.length).toBe(4);

    const empCols = empTable.columns.map((c) => c.name);
    expect(empCols).toEqual(["id", "name", "salary", "department_id"]);

    const idCol = empTable.columns.find((c) => c.name === "id");
    expect(idCol.primary_key).toBe(true);

    expect(empTable.foreign_keys.length).toBe(1);
    expect(empTable.foreign_keys[0]).toEqual({
      column: "department_id",
      references_table: "departments",
      references_column: "id",
    });
  });

  it("executes read-only queries correctly", () => {
    adapter.connect();
    const result = adapter.executeQuery(
      "SELECT name, salary FROM employees ORDER BY salary DESC;"
    );

    expect(result.columns).toEqual(["name", "salary"]);
    expect(result.rows).toEqual([
      ["Priya", 1500000],
      ["Amit", 1200000],
      ["Rahul", 1000000],
    ]);
  });

  it("throws error when executing on unconnected db", () => {
    const unconn = new SQLiteAdapter(tmpDbPath);
    expect(() => unconn.executeQuery("SELECT 1")).toThrow("Database is not connected");
  });
});
