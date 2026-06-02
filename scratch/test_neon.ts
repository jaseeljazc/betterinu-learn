import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.NEON_DATABASE_URL!);

async function main() {
  const tableAlias = "t";
  const sqlFragment = `${tableAlias}.is_active = TRUE`;
  try {
    const rows = await sql`
      SELECT t.id, t.title
      FROM tasks t
      WHERE (${sqlFragment})
      LIMIT 1
    `;
    console.log("Success using template literal directly:", rows);
  } catch (err: any) {
    console.error("Failed using template literal directly:", err.message);
  }
}

main().catch(console.error);
