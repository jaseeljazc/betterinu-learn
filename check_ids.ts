import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.NEON_DATABASE_URL!);

async function main() {
  const adminRows = await sql`SELECT id, full_name FROM admin_accounts`;
  console.log("All Admins:", adminRows);
}
main().catch(console.error);
