import { Client } from "@neondatabase/serverless";
import fs from "fs";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function migrate() {
  console.log("Running migration 010_employees.sql...");
  
  const client = new Client(process.env.NEON_DATABASE_URL!);
  await client.connect();
  
  const sqlContent = fs.readFileSync("./migrations/010_employees.sql", "utf-8");
  
  try {
    await client.query(sqlContent);
    console.log("✓ Migration 010_employees.sql completed successfully!");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await client.end();
  }
}

migrate().catch(console.error);
