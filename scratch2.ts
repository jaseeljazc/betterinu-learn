import { sql } from "./src/lib/db";

async function main() {
  try {
    const emails = ["batgamer7904@gmail.com", "jaseeljazck2@gmail.com"];
    
    // Get admin accounts
    const employees = await sql`
      SELECT id, email FROM admin_accounts 
      WHERE email = ANY(${emails}::text[])
    `;
    
    console.log("Employees found:", employees.length);
    
    for (const emp of employees) {
      for (let i = 1; i <= 3; i++) {
        const priority = i === 1 ? 'high' : i === 2 ? 'medium' : 'low';
        await sql`
          INSERT INTO tasks (
            title, description, type, priority, status, visibility, 
            assigned_to, assigned_by, created_by, is_active
          ) VALUES (
            ${`Mock task ${i} for ${emp.email}`}, 
            ${`This is a mock task created for testing purposes for ${emp.email}`}, 
            'task'::task_type, 
            ${priority}::task_priority, 
            'todo'::task_status, 
            'public'::task_visibility, 
            ${emp.id}, 
            ${emp.id}, 
            ${emp.id}, 
            TRUE
          )
        `;
        console.log(`Created mock task ${i} for ${emp.email}`);
      }
    }
    console.log("Done creating mock tasks.");
  } catch (error) {
    console.error("Error creating mock tasks:", error);
    process.exit(1);
  }
}

main();
