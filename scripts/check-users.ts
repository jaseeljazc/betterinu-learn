import * as dotenv from "dotenv"
import path from "path"

dotenv.config({ path: path.join(process.cwd(), ".env.local") })

import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.NEON_DATABASE_URL!)

async function check() {
  const users = await sql`SELECT id, email FROM admin_accounts WHERE email IN ('batgamer7904@gmail.com', 'jaseeljazck2@gmail.com')`
  console.log(users)
}

check().catch(console.error)
