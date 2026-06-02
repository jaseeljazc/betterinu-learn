import * as dotenv from "dotenv"
import path from "path"

dotenv.config({ path: path.join(process.cwd(), ".env.local") })

import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.NEON_DATABASE_URL!)

async function seed() {
  console.log("Seeding mock tasks for requested users...")

  // Get requested admins
  const admins = await sql`
    SELECT id, email 
    FROM admin_accounts 
    WHERE email IN ('batgamer7904@gmail.com', 'jaseeljazck2@gmail.com')
  `

  if (admins.length !== 2) {
    console.error(`Found ${admins.length} users, expected 2. Check emails.`)
    process.exit(1)
  }

  const user1 = admins.find(a => a.email === 'batgamer7904@gmail.com')?.id
  const user2 = admins.find(a => a.email === 'jaseeljazck2@gmail.com')?.id

  // Insert mock project
  const projects = await sql`
    INSERT INTO task_projects (name, description, created_by)
    VALUES ('Marketing Campaign', 'Q4 Product Launch', ${user1})
    RETURNING id
  `
  const projectId = projects[0].id

  // Insert mock sprint
  const sprints = await sql`
    INSERT INTO task_sprints (project_id, name, start_date, end_date)
    VALUES (
      ${projectId}, 
      'Launch Sprint', 
      (NOW() - INTERVAL '1 days')::date, 
      (NOW() + INTERVAL '13 days')::date
    )
    RETURNING id
  `
  const sprintId = sprints[0].id

  // Insert tasks assigned to batgamer7904@gmail.com
  await sql`
    INSERT INTO tasks (
      title, description, type, status, priority, visibility, 
      project_id, sprint_id, created_by, assigned_by, assigned_to, 
      due_date, estimated_hours
    )
    VALUES 
    (
      'Prepare Launch Copy', 
      'Write email sequences and social media posts for the product launch.',
      'task', 'todo', 'high', 'public',
      ${projectId}, ${sprintId}, ${user2}, ${user2}, ${user1},
      (NOW() + INTERVAL '3 days')::date, 6.0
    ),
    (
      'Review Banner Designs', 
      'Check the ad banners provided by the design team.',
      'feature', 'doing', 'medium', 'public',
      ${projectId}, ${sprintId}, ${user1}, ${user1}, ${user1},
      (NOW() + INTERVAL '1 days')::date, 2.0
    ),
    (
      'Fix Broken Link in Campaign Email', 
      'The call-to-action button in draft 2 leads to a 404 page.',
      'bug', 'todo', 'critical', 'public',
      ${projectId}, ${sprintId}, ${user2}, ${user2}, ${user1},
      (NOW() + INTERVAL '0 days')::date, 1.0
    )
  `

  // Insert tasks assigned to jaseeljazck2@gmail.com
  await sql`
    INSERT INTO tasks (
      title, description, type, status, priority, visibility, 
      project_id, sprint_id, created_by, assigned_by, assigned_to, 
      due_date, estimated_hours
    )
    VALUES 
    (
      'Setup Analytics Tracking', 
      'Ensure Google Analytics and Mixpanel are correctly firing events on the landing page.',
      'task', 'doing', 'high', 'public',
      ${projectId}, ${sprintId}, ${user2}, ${user2}, ${user2},
      (NOW() + INTERVAL '4 days')::date, 5.0
    ),
    (
      'Draft Press Release', 
      'Create the initial draft for the PR agency.',
      'task', 'completed', 'medium', 'public',
      ${projectId}, ${sprintId}, ${user1}, ${user1}, ${user2},
      (NOW() - INTERVAL '2 days')::date, 3.5
    ),
    (
      'Optimize Landing Page Load Time', 
      'Images are currently 5MB+, they need compression.',
      'bug', 'todo', 'high', 'private',
      ${projectId}, ${sprintId}, ${user1}, ${user1}, ${user2},
      (NOW() + INTERVAL '2 days')::date, 4.0
    )
  `

  // Insert tasks unassigned but created by them (to populate lists)
  await sql`
    INSERT INTO tasks (
      title, description, type, status, priority, visibility, 
      project_id, sprint_id, created_by, assigned_by, assigned_to, 
      due_date, estimated_hours
    )
    VALUES 
    (
      'Competitor Analysis', 
      'Review pricing pages of main competitors.',
      'task', 'todo', 'low', 'public',
      ${projectId}, ${sprintId}, ${user1}, NULL, NULL,
      (NOW() + INTERVAL '10 days')::date, 8.0
    ),
    (
      'Schedule Team Sync', 
      'Organize a kick-off meeting for the launch week.',
      'task', 'todo', 'low', 'public',
      ${projectId}, ${sprintId}, ${user2}, NULL, NULL,
      (NOW() + INTERVAL '5 days')::date, 1.0
    )
  `

  console.log("Mock tasks inserted successfully!")
}

seed().catch(console.error)
