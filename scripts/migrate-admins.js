const { config } = require("dotenv");
const { neon } = require("@neondatabase/serverless");

config({ path: ".env.local" });
const sql = neon(process.env.NEON_DATABASE_URL);

async function migrate() {
  const roleResult = await sql.query("SELECT id FROM admin_roles WHERE name = 'super_admin'");
  const roleRows = Array.isArray(roleResult) ? roleResult : (roleResult.rows || []);
  if (roleRows.length === 0) {
    console.error("Super admin role not found.");
    return;
  }
  const superAdminId = roleRows[0].id;
  const adminsResult = await sql.query("SELECT * FROM admins");
  const adminRows = Array.isArray(adminsResult) ? adminsResult : (adminsResult.rows || []);
  
  for (const admin of adminRows) {
    try {
      await sql.query(
        "INSERT INTO admin_accounts (firebase_uid, full_name, email, role_id, status) VALUES ($1, $2, $3, $4, $5)",
        [admin.firebase_uid, "System Admin", admin.email, superAdminId, "active"]
      );
      console.log(`Migrated ${admin.email}`);
    } catch (e) {
      if (e.code !== '23505') { // Ignore unique constraint violation
        console.error(e);
      }
    }
  }
  console.log("Migrated", admins.rows.length, "admins.");
}

migrate().catch(console.error);
