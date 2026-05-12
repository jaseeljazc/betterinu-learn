import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const sql = neon(process.env.NEON_DATABASE_URL!);

async function run() {
  console.log("Adding submitted_files column to assignment_submissions...");
  await sql`
    ALTER TABLE assignment_submissions
    ADD COLUMN IF NOT EXISTS submitted_files JSONB DEFAULT '[]'::jsonb
  `;
  console.log("✓ submitted_files column added (or already exists).");
}

run().catch((e) => { console.error(e); process.exit(1); });
