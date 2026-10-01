import { describe, it, expect } from "vitest";
import path from "path";
import { fileURLToPath } from "url";
import { createDatabaseAdapter } from "../../src/database/connection.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATABASE_PATH = path.resolve(
  __dirname,
  "../../..",
  "database",
  "samples",
  "company.db"
);

describe("Demo SQLite Database (company.db)", () => {
  it("introspects demo schema correctly", () => {
    const config = {
      database_type: "sqlite",
      connection_url: DATABASE_PATH,
    };

    const db = createDatabaseAdapter(config);
    db.connect();

    const schema = db.getSchema();
    const tableNames = schema.tables.map((t) => t.name);

    expect(tableNames).toContain("employees");
    expect(tableNames).toContain("departments");

    db.close();
  });

  it("queries demo database correctly", () => {
    const config = {
      database_type: "sqlite",
      connection_url: DATABASE_PATH,
    };

    const db = createDatabaseAdapter(config);
    db.connect();

    const result = db.executeQuery(
      "SELECT name, salary FROM employees ORDER BY salary DESC"
    );

    expect(result.columns).toEqual(["name", "salary"]);
    expect(result.rows.length).toBe(3);
    expect(result.rows[0][0]).toBe("Priya");

    db.close();
  });
});
