// Quick diagnostic script — run with: npx tsx scripts/diagnose-adith.ts
import { config } from "dotenv"
import { neon } from "@neondatabase/serverless"

config({ path: ".env.local" })

const sql = neon(process.env.NEON_DATABASE_URL!)

async function main() {
  console.log("\n=== 1. Find Adith's admin account ===")
  const accounts = await sql`
    SELECT id, full_name, status, email
    FROM admin_accounts
    WHERE full_name ILIKE '%adith%'
    ORDER BY created_at DESC
  `
  console.table(accounts)

  if (!accounts.length) {
    console.log("No admin account found for 'adith'")
    return
  }

  const adithId = accounts[0].id as string
  console.log("\nUsing adith admin_accounts.id:", adithId)

  console.log("\n=== 2. Check employees row linked to Adith ===")
  const employees = await sql`
    SELECT id, full_name, department_id, admin_account_id
    FROM employees
    WHERE admin_account_id = ${adithId}
  `
  console.table(employees)

  if (!employees.length) {
    console.log("⚠️  NO employees row found for Adith — departmentId will be NULL in task visibility checks!")
  } else {
    const dept = employees[0].department_id
    console.log("Adith's department_id from employees:", dept ?? "NULL — no department linked!")
  }

  console.log("\n=== 3. Tasks assigned_to Adith ===")
  const assignedTasks = await sql`
    SELECT id, task_id, title, visibility, status, is_active, assigned_to, department_id
    FROM tasks
    WHERE assigned_to = ${adithId}
    ORDER BY created_at DESC
    LIMIT 10
  `
  console.table(assignedTasks)

  if (!assignedTasks.length) {
    console.log("⚠️  No tasks found where assigned_to = Adith's admin_account ID.")
    console.log("Check if the task was assigned using a different ID (employee ID vs admin_account ID).")
  }
}

main().catch(console.error)
