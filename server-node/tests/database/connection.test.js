import { describe, it, expect } from "vitest";
import { createDatabaseAdapter } from "../../src/database/connection.js";
import { SQLiteAdapter } from "../../src/database/adapters/sqlite.js";
import { PostgreSQLAdapter } from "../../src/database/adapters/postgres.js";

describe("createDatabaseAdapter", () => {
  it("creates SQLiteAdapter for sqlite config", () => {
    const adapter = createDatabaseAdapter({
      database_type: "sqlite",
      connection_url: "/path/to/db.sqlite",
    });
    expect(adapter).toBeInstanceOf(SQLiteAdapter);
  });

  it("creates PostgreSQLAdapter for postgresql config", () => {
    const adapter = createDatabaseAdapter({
      database_type: "postgresql",
      connection_url: "postgresql://user:pass@localhost:5432/mydb",
    });
    expect(adapter).toBeInstanceOf(PostgreSQLAdapter);
  });

  it("throws error for unsupported database type", () => {
    expect(() =>
      createDatabaseAdapter({
        database_type: "mysql",
        connection_url: "mysql://localhost/db",
      })
    ).toThrow("Unsupported database type: mysql");
  });
});
