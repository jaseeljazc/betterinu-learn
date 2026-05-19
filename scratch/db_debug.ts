import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const sql = neon(process.env.NEON_DATABASE_URL!);

async function run() {
  try {
    console.log("NEON_DATABASE_URL defined:", !!process.env.NEON_DATABASE_URL);
    
    // Check if departments table exists
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    console.log("Tables in DB:", tables.map(t => t.table_name));

    if (tables.some(t => t.table_name === 'departments')) {
      const deptCols = await sql`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'departments'
      `;
      console.log("Columns in 'departments':", deptCols);
    } else {
      console.log("WARNING: 'departments' table does NOT exist!");
    }

    if (tables.some(t => t.table_name === 'employees')) {
      const empCols = await sql`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'employees'
      `;
      console.log("Columns in 'employees':", empCols);
    } else {
      console.log("WARNING: 'employees' table does NOT exist!");
    }

    // Try a simple select from departments
    try {
      const deptCount = await sql`SELECT COUNT(*)::int AS count FROM departments`;
      console.log("Total departments in table:", deptCount[0].count);
    } catch (e: any) {
      console.error("Error querying departments table:", e.message);
    }
  } catch (err: any) {
    console.error("Error in run:", err);
  }
}

run();
