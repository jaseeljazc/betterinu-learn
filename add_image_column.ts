import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const sql = neon(process.env.NEON_DATABASE_URL!);

async function addImageColumn() {
  try {
    await sql`ALTER TABLE courses ADD COLUMN IF NOT EXISTS image TEXT`;
    console.log("Column 'image' added successfully or already exists.");
  } catch (err) {
    console.error("Error adding column:", err);
  }
}

addImageColumn();
