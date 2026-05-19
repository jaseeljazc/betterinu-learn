import "dotenv/config";
import { sql } from "../src/lib/db";
import * as fs from "fs";
import * as path from "path";

async function run() {
  const filePath = path.join(process.cwd(), 'migrations', '013_payroll_rules_update.sql');
  const sqlString = fs.readFileSync(filePath, 'utf-8');
  await sql.unsafe(sqlString);
  console.log('Migration 013 applied successfully!');
  process.exit(0);
}

run().catch((e) => {
  console.error("Error:", e);
  process.exit(1);
});
