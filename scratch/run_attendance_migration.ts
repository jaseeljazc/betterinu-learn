import "dotenv/config";
import { sql } from "../src/lib/db";
import * as fs from "fs";
import * as path from "path";

async function run() {
  const migPath = path.join(__dirname, "../migrations/011_attendance.sql");
  const migSQL = fs.readFileSync(migPath, "utf-8");
  await sql.unsafe(migSQL);
  console.log("✅ Migration 011_attendance.sql applied successfully.");
  process.exit(0);
}

run().catch((e) => {
  console.error("❌ Migration failed:", e.message);
  process.exit(1);
});
