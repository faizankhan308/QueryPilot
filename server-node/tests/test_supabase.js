import pg from "pg";

async function testAllSupabaseRegions() {
  const regions = [
    "aws-0-ap-south-1",
    "aws-0-ap-southeast-1",
    "aws-0-ap-southeast-2",
    "aws-0-us-east-1",
    "aws-0-us-east-2",
    "aws-0-us-west-1",
    "aws-0-us-west-2",
    "aws-0-eu-central-1",
    "aws-0-eu-west-1",
    "aws-0-eu-west-2",
    "aws-0-eu-west-3",
    "aws-0-sa-east-1",
    "aws-0-ca-central-1",
  ];

  const passwords = ["780045@!Fk#$"];
  const projectRef = "qqwgzrassyqkupdhrtuf";

  for (const r of regions) {
    const host = `${r}.pooler.supabase.com`;

    for (const port of [6543, 5432]) {
      for (const user of [`postgres.${projectRef}`, "postgres"]) {
        for (const pass of passwords) {
          const pool = new pg.Pool({
            user,
            password: pass,
            host,
            port,
            database: "postgres",
            ssl: { rejectUnauthorized: false },
            connectionTimeoutMillis: 3000,
          });

          try {
            const client = await pool.connect();
            console.log(
              `\n🎉 SUCCESS! Connected to ${host}:${port} as user '${user}'`
            );
            const res = await client.query(
              "SELECT table_name FROM information_schema.tables WHERE table_schema='public'"
            );
            console.log("Tables in DB:", res.rows.map((row) => row.table_name));
            client.release();
            await pool.end();
            return { host, port, user, pass };
          } catch (err) {
            // console.log(`Failed ${host}:${port} (${user}): ${err.message}`);
            await pool.end().catch(() => {});
          }
        }
      }
    }
  }
  console.log("None connected.");
}

testAllSupabaseRegions();
