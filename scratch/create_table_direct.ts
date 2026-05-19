import "dotenv/config";
import { sql } from "../src/lib/db";
import * as fs from "fs";
import * as path from "path";

async function run() {
  const sqlContent = `
    CREATE TABLE IF NOT EXISTS attendance (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
      date        DATE NOT NULL,
      status      VARCHAR(20) NOT NULL CHECK (status IN ('Present', 'Absent', 'Leave', 'Holiday')),
      note        TEXT,
      marked_by   UUID REFERENCES admin_accounts(id),
      created_at  TIMESTAMPTZ DEFAULT NOW(),
      updated_at  TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(employee_id, date)
    );
  `;
  
  console.log("Creating table...");
  const res = await sql.unsafe(sqlContent);
  console.log("Table creation result:", res);
  
  const tables = await sql`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
  `;
  console.log("Tables in DB now:", tables.map(t => t.table_name));
  
  process.exit(0);
}

run().catch((e) => {
  console.error("Error:", e);
  process.exit(1);
});
