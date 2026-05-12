import { Client } from "@neondatabase/serverless";
import fs from "fs";

async function migrate() {
  console.log("Running migrations...");
  
  const client = new Client(process.env.NEON_DATABASE_URL!);
  await client.connect();
  
  const sqlContent = fs.readFileSync("./scripts/migrate.sql", "utf-8");
  
  try {
    await client.query(sqlContent);
    console.log("✓ Migrations completed successfully!");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await client.end();
  }
}

migrate().catch(console.error);
