const { config } = require("dotenv");
config({ path: ".env.local" });

const { sql } = require("../src/lib/db");

async function main() {
  console.log("Adding status column to students table...");
  try {
    await sql`
      ALTER TABLE students 
      ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' 
      CHECK (status IN ('active', 'inactive', 'pending'));
    `;
    console.log("✓ Successfully added status column to students table.");
  } catch (error) {
    console.error("Failed to add status column:", error);
  }
  process.exit(0);
}

main();
