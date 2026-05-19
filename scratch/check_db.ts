import "dotenv/config";
import { sql } from "../src/lib/db";

async function run() {
  console.log("DATABASE_URL:", process.env.DATABASE_URL);
  const tables = await sql`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
  `;
  console.log("Tables in DB:", tables.map(t => t.table_name));
  process.exit(0);
}

run().catch((e) => {
  console.error("Error:", e);
  process.exit(1);
});
