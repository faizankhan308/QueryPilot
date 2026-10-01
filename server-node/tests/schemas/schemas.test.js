/**
 * schemas.test.js
 *
 * Verifies that all Zod schemas accept valid data and reject invalid data,
 * matching the behaviour of the Python Pydantic models they mirror.
 */

import { describe, it, expect } from "vitest";

import { DatabaseSessionSchema, QueryRequestSchema, QueryResponseSchema } from "../../src/schemas/session.js";
import { GenerateRequestSchema, GenerateResponseSchema } from "../../src/schemas/generate.js";
import { ColumnSchema, ForeignKeySchema, TableSchema, DatabaseSchema } from "../../src/schemas/schema.js";
import { DatabaseConfigSchema } from "../../src/schemas/database.js";

// ─── DatabaseSession ─────────────────────────────────────────────────────────

describe("DatabaseSessionSchema", () => {
  it("accepts a valid session response shape", () => {
    const result = DatabaseSessionSchema.parse({
      session_id: "abc-123",
      database_type: "sqlite",
    });
    expect(result.session_id).toBe("abc-123");
    expect(result.database_type).toBe("sqlite");
  });

  it("rejects when session_id is missing", () => {
    expect(() =>
      DatabaseSessionSchema.parse({ database_type: "sqlite" })
    ).toThrow();
  });
});

// ─── QueryRequest ─────────────────────────────────────────────────────────────

describe("QueryRequestSchema", () => {
  it("accepts valid session_id and sql", () => {
    const result = QueryRequestSchema.parse({
      session_id: "abc-123",
      sql: "SELECT * FROM employees",
    });
    expect(result.sql).toBe("SELECT * FROM employees");
  });

  it("rejects empty sql", () => {
    expect(() =>
      QueryRequestSchema.parse({ session_id: "abc-123", sql: "" })
    ).toThrow();
  });

  it("rejects missing session_id", () => {
    expect(() =>
      QueryRequestSchema.parse({ sql: "SELECT 1" })
    ).toThrow();
  });
});

// ─── QueryResponse ────────────────────────────────────────────────────────────

describe("QueryResponseSchema", () => {
  it("accepts a valid query result", () => {
    const result = QueryResponseSchema.parse({
      success: true,
      columns: ["name", "salary"],
      rows: [["Alice", 100000], ["Bob", 90000]],
    });
    expect(result.success).toBe(true);
    expect(result.columns).toHaveLength(2);
    expect(result.rows).toHaveLength(2);
  });

  it("accepts an empty result set", () => {
    const result = QueryResponseSchema.parse({
      success: true,
      columns: [],
      rows: [],
    });
    expect(result.rows).toHaveLength(0);
  });

  it("rejects when columns is not an array", () => {
    expect(() =>
      QueryResponseSchema.parse({ success: true, columns: "name", rows: [] })
    ).toThrow();
  });
});

// ─── GenerateRequest ──────────────────────────────────────────────────────────

describe("GenerateRequestSchema", () => {
  it("accepts valid session_id and question", () => {
    const result = GenerateRequestSchema.parse({
      session_id: "abc-123",
      question: "Show me all employees",
    });
    expect(result.question).toBe("Show me all employees");
  });

  it("rejects empty question (mirrors Pydantic min_length=1)", () => {
    expect(() =>
      GenerateRequestSchema.parse({ session_id: "abc-123", question: "" })
    ).toThrow();
  });
});

// ─── GenerateResponse ─────────────────────────────────────────────────────────

describe("GenerateResponseSchema", () => {
  it("accepts a full valid response", () => {
    const result = GenerateResponseSchema.parse({
      sql: "SELECT * FROM employees;",
      explanation: "Returns all employees.",
      confidence: 0.95,
    });
    expect(result.confidence).toBe(0.95);
  });

  it("rejects confidence above 1", () => {
    expect(() =>
      GenerateResponseSchema.parse({
        sql: "SELECT 1",
        explanation: "test",
        confidence: 1.5,
      })
    ).toThrow();
  });

  it("rejects confidence below 0", () => {
    expect(() =>
      GenerateResponseSchema.parse({
        sql: "SELECT 1",
        explanation: "test",
        confidence: -0.1,
      })
    ).toThrow();
  });
});

// ─── DatabaseSchema (schema extraction shape) ─────────────────────────────────

describe("DatabaseSchema", () => {
  const validSchema = {
    database_type: "sqlite",
    tables: [
      {
        name: "employees",
        columns: [
          { name: "id", type: "INTEGER", primary_key: true },
          { name: "name", type: "TEXT", primary_key: false },
        ],
        foreign_keys: [
          {
            column: "department_id",
            references_table: "departments",
            references_column: "id",
          },
        ],
      },
    ],
  };

  it("accepts a valid schema shape (matches SchemaExplorer expectations)", () => {
    const result = DatabaseSchema.parse(validSchema);
    expect(result.tables).toHaveLength(1);
    expect(result.tables[0].columns).toHaveLength(2);
    expect(result.tables[0].foreign_keys[0].references_table).toBe("departments");
  });

  it("accepts a table with no foreign keys", () => {
    const result = DatabaseSchema.parse({
      database_type: "postgresql",
      tables: [
        {
          name: "departments",
          columns: [{ name: "id", type: "SERIAL", primary_key: true }],
          foreign_keys: [],
        },
      ],
    });
    expect(result.tables[0].foreign_keys).toHaveLength(0);
  });

  it("rejects when primary_key is missing from a column", () => {
    expect(() =>
      DatabaseSchema.parse({
        database_type: "sqlite",
        tables: [
          {
            name: "t",
            columns: [{ name: "id", type: "INTEGER" }], // missing primary_key
            foreign_keys: [],
          },
        ],
      })
    ).toThrow();
  });
});

// ─── DatabaseConfigSchema ─────────────────────────────────────────────────────

describe("DatabaseConfigSchema", () => {
  it("accepts sqlite type", () => {
    const result = DatabaseConfigSchema.parse({
      database_type: "sqlite",
      connection_url: "/tmp/test.db",
    });
    expect(result.database_type).toBe("sqlite");
  });

  it("accepts postgresql type", () => {
    const result = DatabaseConfigSchema.parse({
      database_type: "postgresql",
      connection_url: "postgresql://user:pass@localhost:5432/db",
    });
    expect(result.database_type).toBe("postgresql");
  });

  it("rejects unsupported database_type", () => {
    expect(() =>
      DatabaseConfigSchema.parse({
        database_type: "mysql",
        connection_url: "mysql://localhost/db",
      })
    ).toThrow();
  });

  it("rejects empty connection_url", () => {
    expect(() =>
      DatabaseConfigSchema.parse({ database_type: "sqlite", connection_url: "" })
    ).toThrow();
  });
});
