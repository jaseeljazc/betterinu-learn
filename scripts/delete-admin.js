const { config } = require("dotenv");
const { neon } = require("@neondatabase/serverless");

config({ path: ".env.local" });
const sql = neon(process.env.NEON_DATABASE_URL);

async function deleteAdmin() {
  await sql.query("DELETE FROM admin_accounts WHERE email = 'admin@learnforge.app'");
  console.log("Deleted admin@learnforge.app from admin_accounts");
}

deleteAdmin().catch(console.error);
