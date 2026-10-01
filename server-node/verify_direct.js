import "dotenv/config";
import { PostgreSQLAdapter } from "./src/database/adapters/postgres.js";

async function run() {
  const url = process.env.TEST_POSTGRES_URL;
  const masked = url.replace(/:([^:@]+)@/, ":****@");

  console.log("=== QueryPilot Supabase PostgreSQL Verification ===");
  console.log(`URL: ${masked}\n`);

  const adapter = new PostgreSQLAdapter(url);

  // Step 1: Connection
  console.log("Step 1: Connecting...");
  try {
    await adapter.connect();
    console.log("  ✅ Connected\n");
  } catch (err) {
    console.error("  ❌ Connection FAILED:", err.message);
    return;
  }

  // Step 2: Schema introspection
  console.log("Step 2: Introspecting schema...");
  let schema;
  try {
    schema = await adapter.getSchema();
    console.log(`  Database type : ${schema.database_type}`);
    console.log(`  Tables found  : ${schema.tables.length}`);
    schema.tables.forEach((t, i) => console.log(`    [${i + 1}] ${t.name} (${t.columns.length} cols)`));
    console.log();
  } catch (err) {
    console.error("  ❌ Schema introspection FAILED:", err.message);
    await adapter.close();
    return;
  }

  // Step 3: Verify all 6 tables
  console.log("Step 3: Verifying 6 expected tables...");
  const expected = ["categories", "customers", "order_items", "orders", "products", "reviews"];
  const found = schema.tables.map(t => t.name.toLowerCase());
  let allFound = true;
  for (const t of expected) {
    const ok = found.includes(t);
    if (!ok) allFound = false;
    console.log(`  ${ok ? "✅" : "❌"} ${t}`);
  }
  console.log(allFound ? "\n  All 6 tables verified ✅\n" : "\n  ⚠️  Missing tables\n");

  // Step 4: Read-only SELECT
  console.log("Step 4: SELECT * FROM customers LIMIT 5...");
  try {
    const result = await adapter.executeQuery("SELECT * FROM customers LIMIT 5;");
    console.log(`  ✅ Query OK — columns: ${result.columns.join(", ")}, rows: ${result.rows.length}\n`);
  } catch (err) {
    console.error("  ❌ SELECT FAILED:", err.message);
  }

  // Step 5: Destructive query safety via API
  console.log("Step 5: Destructive-query safety check (DELETE blocked by API)...");
  try {
    const form = new URLSearchParams({ database_type: "postgresql", connection_url: url });
    const sRes = await fetch("http://127.0.0.1:3001/database/session", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString()
    });
    const sData = await sRes.json();
    if (!sRes.ok) { console.error("  ❌ Session failed:", sData.detail); }
    else {
      const dRes = await fetch("http://127.0.0.1:3001/database/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sData.session_id, sql: "DELETE FROM customers WHERE id = 1;" })
      });
      const dData = await dRes.json();
      if (dRes.status === 400 && dData.detail === "Only SELECT statements are allowed") {
        console.log(`  ✅ DELETE blocked (HTTP 400): "${dData.detail}"\n`);
      } else {
        console.error("  ❌ Safety guard failed:", dRes.status, dData);
      }
    }
  } catch (err) {
    console.error("  ❌ API call failed:", err.message);
  }

  await adapter.close();
  console.log("=== Verification Complete ===");
}

run();
