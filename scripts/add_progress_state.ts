import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const sql = neon(process.env.NEON_DATABASE_URL!);

async function main() {
  await sql`ALTER TABLE students ADD COLUMN IF NOT EXISTS progress_state JSONB DEFAULT '{}'::jsonb;`;
  console.log("Added progress_state column successfully.");
}

main().catch(console.error);
