import { describe, it, expect } from "vitest";
import { PostgreSQLAdapter } from "../../src/database/adapters/postgres.js";
import { DatabaseConnectionError } from "../../src/database/exceptions.js";

const TEST_POSTGRES_URL = process.env.TEST_POSTGRES_URL;

describe("PostgreSQLAdapter", () => {
  it("fails gracefully with DatabaseConnectionError on bad connection URL", async () => {
    const adapter = new PostgreSQLAdapter(
      "postgresql://invalid_user:invalid_pass@127.0.0.1:5999/nonexistent"
    );

    await expect(adapter.connect()).rejects.toThrow(DatabaseConnectionError);
  });

  it("correctly enables SSL for both Supabase Direct and Session Pooler URLs", () => {
    const directAdapter = new PostgreSQLAdapter(
      "postgresql://postgres:pass@db.projectref.supabase.co:5432/postgres"
    );
    expect(directAdapter._getPoolConfig().ssl).toEqual({ rejectUnauthorized: false });

    const poolerAdapter = new PostgreSQLAdapter(
      "postgresql://postgres.projectref:pass@aws-0-us-east-1.pooler.supabase.com:5432/postgres"
    );
    expect(poolerAdapter._getPoolConfig().ssl).toEqual({ rejectUnauthorized: false });
  });

  (TEST_POSTGRES_URL ? it : it.skip)(
    "connects and runs queries on real PostgreSQL if TEST_POSTGRES_URL is provided",
    async () => {
      const adapter = new PostgreSQLAdapter(TEST_POSTGRES_URL);
      await adapter.connect();

      const schema = await adapter.getSchema();
      expect(schema.database_type).toBe("postgresql");

      const result = await adapter.executeQuery("SELECT 1 AS num");
      expect(result.columns).toEqual(["num"]);
      expect(result.rows[0][0]).toBe(1);

      await adapter.close();
    }
  );
});
