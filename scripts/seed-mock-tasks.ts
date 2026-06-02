import * as dotenv from "dotenv"
import path from "path"

dotenv.config({ path: path.join(process.cwd(), ".env.local") })

import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.NEON_DATABASE_URL!)

async function seed() {
  console.log("Seeding mock tasks...")

  // Get some admins
  const admins = await sql`SELECT id FROM admin_accounts LIMIT 2`
  if (admins.length === 0) {
    console.error("No admin_accounts found. Run seed-rbac first.")
    process.exit(1)
  }

  const admin1 = admins[0].id
  const admin2 = admins[1]?.id ?? admin1

  // Insert mock project
  const projects = await sql`
    INSERT INTO task_projects (name, description, created_by)
    VALUES ('Platform Refactor', 'Q3 Engineering Initiatives', ${admin1})
    RETURNING id
  `
  const projectId = projects[0].id

  // Insert mock sprint
  const sprints = await sql`
    INSERT INTO task_sprints (project_id, name, start_date, end_date)
    VALUES (
      ${projectId}, 
      'Sprint 42', 
      (NOW() - INTERVAL '3 days')::date, 
      (NOW() + INTERVAL '11 days')::date
    )
    RETURNING id
  `
  const sprintId = sprints[0].id

  // Insert tasks
  await sql`
    INSERT INTO tasks (
      title, description, type, status, priority, visibility, 
      project_id, sprint_id, created_by, assigned_by, assigned_to, 
      due_date, estimated_hours
    )
    VALUES 
    (
      'Fix JSON parsing error on verify route', 
      'The verify route crashes when valid token is passed due to DISTINCT json.',
      'bug', 'completed', 'critical', 'public',
      ${projectId}, ${sprintId}, ${admin1}, ${admin1}, ${admin2},
      (NOW() - INTERVAL '1 day')::date, 2.5
    ),
    (
      'Implement Calendar View', 
      'Render a month-grid of tasks plotted by their due dates.',
      'feature', 'todo', 'high', 'public',
      ${projectId}, ${sprintId}, ${admin1}, ${admin1}, ${admin1},
      (NOW() + INTERVAL '4 days')::date, 8.0
    ),
    (
      'Build Task Detail Page', 
      'Two-column layout showing all fields in read mode.',
      'feature', 'doing', 'medium', 'public',
      ${projectId}, ${sprintId}, ${admin2}, ${admin1}, ${admin2},
      (NOW() + INTERVAL '2 days')::date, 5.0
    ),
    (
      'Review PR for Dashboard Charts', 
      'Ensure recharts components are responsive.',
      'task', 'todo', 'low', 'public',
      ${projectId}, ${sprintId}, ${admin2}, NULL, NULL, -- unassigned backlog
      (NOW() + INTERVAL '7 days')::date, 1.5
    ),
    (
      'Update Documentation', 
      'Write guidelines for using the new task management system.',
      'task', 'todo', 'low', 'private',
      NULL, NULL, ${admin1}, ${admin2}, ${admin1},
      (NOW() + INTERVAL '14 days')::date, 4.0
    )
  `

  console.log("Seeding complete!")
}

seed().catch(console.error)
