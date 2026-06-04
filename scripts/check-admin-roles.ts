import { Client } from "@neondatabase/serverless";
import { join } from "path";
import * as dotenv from "dotenv";
dotenv.config({ path: join(process.cwd(), ".env.local") });

async function main() {
  const url = process.env.NEON_DATABASE_URL;
  const client = new Client(url);
  await client.connect();
  const res = await client.query(`
    SELECT aa.email, ar.name as role_name
    FROM admin_accounts aa
    JOIN admin_account_roles aar ON aar.admin_account_id = aa.id
    JOIN admin_roles ar ON ar.id = aar.role_id
  `);
  console.log("Admin accounts and roles:", res.rows);
  await client.end();
}
main().catch(console.error);
