import "dotenv/config";

function maskUrl(url) {
  if (!url) return "<not set>";
  return url.replace(/:([^:@]+)@/, ":****@");
}

async function runSupabaseVerification() {
  const url = process.env.TEST_POSTGRES_URL;

  console.log("=== QueryPilot Supabase PostgreSQL Verification ===");
  console.log("Target Connection:", maskUrl(url));

  if (!url || url.includes("[MY_PASSWORD]") || url.includes("YOUR_PASSWORD")) {
    console.log("\n[STATUS]: Awaiting Password.");
    console.log(
      "Please insert your actual Supabase database password into server-node/.env under TEST_POSTGRES_URL.\n" +
      "Example: TEST_POSTGRES_URL=postgresql://postgres:your_real_password@db.qqwgzrassyqkupdhrtuf.supabase.co:5432/postgres\n"
    );
    return;
  }

  try {
    // 1. Test POST /database/session
    console.log("\n1. Testing POST /database/session...");
    const sessionRes = await fetch("http://127.0.0.1:3001/database/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        database_type: "postgresql",
        connection_url: url,
      }),
    });

    const sessionData = await sessionRes.json();
    if (!sessionRes.ok) {
      console.error("❌ Session creation failed:", sessionRes.status, sessionData);
      return;
    }
    console.log("✅ Session created successfully:", sessionData.session_id);
    const sessionId = sessionData.session_id;

    // 2. Test POST /database/schema
    console.log("\n2. Testing POST /database/schema...");
    const schemaRes = await fetch(
      `http://127.0.0.1:3001/database/schema?session_id=${sessionId}`,
      { method: "POST" }
    );
    const schemaData = await schemaRes.json();
    if (!schemaRes.ok) {
      console.error("❌ Schema extraction failed:", schemaRes.status, schemaData);
      return;
    }

    const tableNames = schemaData.tables.map((t) => t.name.toLowerCase());
    console.log("Found tables:", tableNames);

    const expectedTables = [
      "categories",
      "customers",
      "order_items",
      "orders",
      "products",
      "reviews",
    ];

    let allTablesFound = true;
    for (const table of expectedTables) {
      const found = tableNames.includes(table);
      console.log(` - Table '${table}':`, found ? "✅ Found" : "❌ Missing");
      if (!found) allTablesFound = false;
    }

    // 3. Test read-only query: SELECT * FROM customers LIMIT 5;
    console.log("\n3. Testing read-only query (SELECT * FROM customers LIMIT 5;)...");
    const queryRes = await fetch("http://127.0.0.1:3001/database/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: sessionId,
        sql: "SELECT * FROM customers LIMIT 5;",
      }),
    });
    const queryData = await queryRes.json();
    if (!queryRes.ok) {
      console.error("❌ Query execution failed:", queryRes.status, queryData);
    } else {
      console.log("✅ Query executed successfully:");
      console.log("   Columns:", queryData.columns);
      console.log(`   Rows returned: ${queryData.rows?.length || 0}`);
    }

    // 4. Test destructive query blocked by SQL safety: DELETE FROM customers WHERE id = 1;
    console.log("\n4. Testing SQL safety blocker (DELETE FROM customers WHERE id = 1;)...");
    const safetyRes = await fetch("http://127.0.0.1:3001/database/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: sessionId,
        sql: "DELETE FROM customers WHERE id = 1;",
      }),
    });
    const safetyData = await safetyRes.json();
    if (safetyRes.status === 400 && safetyData.detail === "Only SELECT statements are allowed") {
      console.log("✅ Safety guard successfully blocked destructive query (400 Bad Request):", safetyData.detail);
    } else {
      console.error("❌ Safety guard failed:", safetyRes.status, safetyData);
    }

    console.log("\n=== Supabase Verification Complete ===");
  } catch (err) {
    console.error("❌ Unexpected error during verification:", err.message);
  }
}

runSupabaseVerification();
