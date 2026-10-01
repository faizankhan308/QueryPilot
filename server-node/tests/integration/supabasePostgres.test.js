import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import "dotenv/config";

const postgresUrl = process.env.TEST_POSTGRES_URL;
const isLivePostgresConfigured =
  postgresUrl &&
  !postgresUrl.includes("[MY_PASSWORD]") &&
  !postgresUrl.includes("YOUR_PASSWORD");

describe("Supabase PostgreSQL Integration Verification", () => {
  (isLivePostgresConfigured ? it : it.skip)(
    "creates session, introspects tables, queries data, and verifies safety",
    async () => {
      // 1. Test POST /database/session
      const sessionRes = await request(app)
        .post("/database/session")
        .field("database_type", "postgresql")
        .field("connection_url", postgresUrl);

      expect(sessionRes.status).toBe(200);
      expect(sessionRes.body.session_id).toBeTypeOf("string");
      expect(sessionRes.body.database_type).toBe("postgresql");

      const sessionId = sessionRes.body.session_id;

      // 2. Test POST /database/schema
      const schemaRes = await request(app).post(
        `/database/schema?session_id=${sessionId}`
      );

      expect(schemaRes.status).toBe(200);
      expect(schemaRes.body.database_type).toBe("postgresql");

      const tableNames = schemaRes.body.tables.map((t) => t.name.toLowerCase());

      // Verify the 6 tables requested
      const expectedTables = [
        "categories",
        "customers",
        "order_items",
        "orders",
        "products",
        "reviews",
      ];

      for (const table of expectedTables) {
        expect(tableNames).toContain(table);
      }

      // 3. Test a real read-only PostgreSQL query
      const queryRes = await request(app)
        .post("/database/execute")
        .send({
          session_id: sessionId,
          sql: "SELECT * FROM customers LIMIT 5;",
        });

      expect(queryRes.status).toBe(200);
      expect(queryRes.body.success).toBe(true);
      expect(queryRes.body.columns.length).toBeGreaterThan(0);
      expect(queryRes.body.rows.length).toBeGreaterThan(0);

      // 4. Test destructive query blocked by SQL safety
      const destructiveRes = await request(app)
        .post("/database/execute")
        .send({
          session_id: sessionId,
          sql: "DELETE FROM customers WHERE id = 1;",
        });

      expect(destructiveRes.status).toBe(400);
      expect(destructiveRes.body.detail).toBe("Only SELECT statements are allowed");
    }
  );
});
