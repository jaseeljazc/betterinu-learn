import { sql } from "../src/lib/db";

async function checkColumns() {
  try {
    const res = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'admin_accounts'
    `;
    console.log("Columns of admin_accounts:", res);
  } catch (error) {
    console.error("Error querying columns:", error);
  } finally {
    process.exit(0);
  }
}

checkColumns();
