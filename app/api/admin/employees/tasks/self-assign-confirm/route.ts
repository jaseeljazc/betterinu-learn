/**
 * app/api/admin/employees/tasks/self-assign-confirm/route.ts
 *
 * Auto-confirms pending self-assign claims whose 48-hour deadline has passed.
 *
 * Trigger options:
 *   A. Call POST /api/admin/employees/tasks/self-assign-confirm from a Vercel Cron
 *      job (vercel.json: { "crons": [{ "path": "/api/admin/employees/tasks/self-assign-confirm", "schedule": "0 * * * *" }] })
 *   B. Call it from a task detail page load (GET, lightweight check).
 *
 * Security: Protected by CRON_SECRET env var. The Vercel platform injects
 * Authorization: Bearer <CRON_SECRET> automatically for scheduled invocations.
 * For manual calls, pass the same header.
 */
import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { logTaskChange } from "@/lib/task-audit"

export async function POST(req: NextRequest) {
  // Authenticate — only cron or privileged internal callers may trigger this
  const authHeader = req.headers.get("authorization")
  const expectedToken = process.env.CRON_SECRET
    ? `Bearer ${process.env.CRON_SECRET}`
    : null

  if (expectedToken && authHeader !== expectedToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Find all expired pending self-assigns
  const expired = await sql`
    SELECT id, task_id, assigned_to
    FROM tasks
    WHERE self_assign_approval_status = 'pending'
      AND self_assign_deadline < NOW()
      AND is_active = TRUE
  `

  if (!expired.length) {
    return NextResponse.json({ confirmed: 0 })
  }

  let confirmed = 0

  for (const row of expired) {
    try {
      await sql`
        UPDATE tasks SET
          self_assign_approval_status = 'confirmed',
          updated_at                  = NOW()
        WHERE id = ${row.id as string}
      `

      await logTaskChange({
        taskId: row.id as string,
        changedBy: row.assigned_to as string,
        fieldName: "self_assign_approval_status",
        oldValue: "pending",
        newValue: "confirmed",
        action: "self_assign_confirmed",
      })

      confirmed++
    } catch (err) {
      // Log but don't abort the batch — process remaining tasks
      console.error(
        `[self-assign-confirm] Failed to confirm task ${row.task_id}:`,
        err
      )
    }
  }

  return NextResponse.json({ confirmed })
}
