import { config } from "dotenv";
config({ path: ".env.local" });
import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.NEON_DATABASE_URL!);
async function run() {
  try {
    await sql`ALTER TABLE accounts ADD COLUMN ifsc_code VARCHAR(50);`;
    console.log("Success");
  } catch (e: any) {
    if (e.message.includes("already exists")) {
      console.log("Column already exists");
    } else {
      console.error(e);
    }
  }
}
run();
