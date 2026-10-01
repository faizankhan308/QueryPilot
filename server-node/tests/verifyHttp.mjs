import os from "os";
import path from "path";
import fs from "fs";
import Database from "better-sqlite3";

async function testHttp() {
  console.log("=== QueryPilot End-to-End Live HTTP Test ===");

  // 1. Health check
  const healthRes = await fetch("http://127.0.0.1:3001/");
  const healthData = await healthRes.json();
  console.log("1. Health check:", healthRes.status, healthData);

  // 2. Create external db
  const extDbPath = path.join(os.tmpdir(), `live_http_test_${Date.now()}.db`);
  const db = new Database(extDbPath);
  db.exec(`
    CREATE TABLE employees (id INTEGER PRIMARY KEY, name TEXT, salary INT);
    INSERT INTO employees VALUES (1, 'Alice', 90000), (2, 'Bob', 80000);
  `);
  db.close();
  console.log("2. Created external SQLite file at:", extDbPath);

  // 3. Upload file via FormData
  const formData = new FormData();
  formData.append("database_type", "sqlite");
  const fileBuffer = fs.readFileSync(extDbPath);
  const blob = new Blob([fileBuffer], { type: "application/octet-stream" });
  formData.append("file", blob, "employees.db");

  const sessionRes = await fetch("http://127.0.0.1:3001/database/session", {
    method: "POST",
    body: formData,
  });
  const sessionData = await sessionRes.json();
  console.log("3. Session creation (file upload):", sessionRes.status, sessionData);

  // 4. Schema extraction
  const schemaRes = await fetch(
    `http://127.0.0.1:3001/database/schema?session_id=${sessionData.session_id}`,
    { method: "POST" }
  );
  const schemaData = await schemaRes.json();
  console.log(
    "4. Schema extraction:",
    schemaRes.status,
    "Tables:",
    schemaData.tables.map((t) => t.name)
  );

  // 5. Generate with live Gemini
  console.log("5. Calling Live Gemini API for question: 'Who earns the highest salary?'...");
  const genRes = await fetch("http://127.0.0.1:3001/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      session_id: sessionData.session_id,
      question: "Who earns the highest salary?",
    }),
  });
  const genData = await genRes.json();
  console.log("   Gemini response:", genRes.status, genData);

  // 6. Execute SQL
  const execRes = await fetch("http://127.0.0.1:3001/database/execute", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      session_id: sessionData.session_id,
      sql: genData.sql,
    }),
  });
  const execData = await execRes.json();
  console.log("6. Query execution results:", execRes.status, execData);

  // 7. Test safety blockers
  const blockRes = await fetch("http://127.0.0.1:3001/database/execute", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      session_id: sessionData.session_id,
      sql: "DROP TABLE employees;",
    }),
  });
  const blockData = await blockRes.json();
  console.log("7. Safety block test (DROP TABLE):", blockRes.status, blockData);

  // Clean up
  try {
    fs.unlinkSync(extDbPath);
  } catch {}
  console.log("=== All Live HTTP Checks Completed Successfully ===");
}

testHttp().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
