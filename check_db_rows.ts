import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.NEON_DATABASE_URL!);

async function main() {
  const req = await fetch('http://localhost:3000/api/admin/employees?limit=10', {
    headers: {
      // Fake a cookie session or just hit the DB directly to see what the API actually returns
    }
  });
  // Since I don't have a cookie, I'll just run the DB query that /api/admin/employees runs.
  const rows = await sql`
    SELECT
      e.id,
      e.admin_account_id
    FROM employees e
    LIMIT 2
  `;
  console.log("DB rows:", rows);
}
main().catch(console.error);
