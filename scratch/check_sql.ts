import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.join(__dirname, "../.env.local") });

import { sql } from "../src/lib/db";

async function run() {
  console.log("sql type:", typeof sql);
  console.log("sql properties:", Object.keys(sql));
  console.log("NEON_DATABASE_URL:", process.env.NEON_DATABASE_URL);
  
  // Check if we can run query
  const res = await sql`SELECT NOW()`;
  console.log("Query result:", res);
  
  process.exit(0);
}

run().catch((e) => {
  console.error("Error:", e);
  process.exit(1);
});
