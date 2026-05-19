import "dotenv/config";
import { sql } from "../src/lib/db";
async function run() {
  const cats = await sql`SELECT * FROM account_categories`;
  console.log(cats);
  process.exit(0);
}
run();
