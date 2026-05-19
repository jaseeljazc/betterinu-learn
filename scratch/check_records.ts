import "dotenv/config";
import { sql } from "../src/lib/db";

async function run() {
  const records = await sql`SELECT * FROM attendance`;
  console.log("Records in DB:", records);
  process.exit(0);
}

run().catch((e) => {
  console.error("Error:", e);
  process.exit(1);
});
