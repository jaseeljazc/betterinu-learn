import { sql } from "../src/lib/db";

async function applyMigration() {
  console.log("Applying migration 015 using SQL template literals...");
  try {
    await sql`ALTER TABLE admin_accounts ADD COLUMN IF NOT EXISTS temp_password VARCHAR(255)`;
    console.log("✓ ALTER TABLE statement ran successfully.");

    await sql`COMMENT ON COLUMN admin_accounts.temp_password IS 'Stores the temporary password of the admin for recovery/display in table'`;
    console.log("✓ COMMENT ON COLUMN statement ran successfully.");

    console.log("✓ Migration 015 applied successfully!");
  } catch (error) {
    console.error("Migration execution failed:", error);
  } finally {
    process.exit(0);
  }
}

applyMigration();
