/**
 * Run migration 030 to fix student_leave_fines table
 * Usage: npx tsx scripts/run-migration-030-fix.ts
 */
import { Client } from "@neondatabase/serverless";
import { readFileSync } from "fs";
import { join } from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: join(process.cwd(), ".env.local") });

async function main() {
  const url = process.env.NEON_DATABASE_URL;
  if (!url) throw new Error("NEON_DATABASE_URL not set in .env.local");

  const sql = readFileSync(
    join(process.cwd(), "migrations", "030_student_leave_fines.sql"),
    "utf-8"
  );

  console.log("Connecting to database...");
  const client = new Client(url);
  await client.connect();

  try {
    console.log("Running migration 030: Fix student_leave_fines table...");
    await client.query(sql);
    console.log("✅ Migration executed successfully");

    // Verify
    const result = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'student_leave_fines'
      ORDER BY ordinal_position
    `);
    console.log("\n✅ Table columns:");
    result.rows.forEach((row: any) => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
