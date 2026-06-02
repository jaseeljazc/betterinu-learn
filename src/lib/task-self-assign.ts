/**
 * lib/task-self-assign.ts — Self-assign backlog claim flow.
 *
 * claimBacklogTask  — called by a logged-in admin to claim an unassigned task.
 * The cron/trigger handler that auto-confirms expired claims lives in:
 *   app/api/admin/employees/tasks/self-assign-confirm/route.ts
 *
 * Server-only — never import from client components.
 */
import { sql } from "@/lib/db"
import { logTaskChange } from "@/lib/task-audit"
import nodemailer from "nodemailer"

// ---------------------------------------------------------------------------
// Internal email helper (fire-and-forget, errors are logged not thrown)
// ---------------------------------------------------------------------------

async function sendSelfAssignNotification({
  toEmail,
  toName,
  claimantName,
  taskId,
  taskTitle,
  deadlineAt,
}: {
  toEmail: string
  toName: string
  claimantName: string
  taskId: string
  taskTitle: string
  deadlineAt: Date
}) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) return

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_APP_PASSWORD,
    },
  })

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://betterinu-learn.vercel.app"
  const taskUrl = `${appUrl}/admin/tasks?highlight=${taskId}`
  const fromName = process.env.EMAIL_FROM_NAME || "Betterinu"
  const deadline = deadlineAt.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  })

  try {
    await transporter.sendMail({
      from: `"${fromName}" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: `Self-Assign Request: "${taskTitle}"`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;border:1px solid #e5e2da;border-radius:12px;padding:32px;background:#fdfcf9">
          <h2 style="color:#1a4031">Task Self-Assign Notification</h2>
          <p>Hi ${toName},</p>
          <p><strong>${claimantName}</strong> has self-claimed the following task from the backlog and is awaiting your confirmation:</p>
          <div style="background:#f5f5f0;padding:16px;border-radius:8px;margin:16px 0">
            <p style="margin:0;font-weight:bold">${taskTitle}</p>
            <p style="margin:6px 0 0;font-size:13px;color:#7a7a62">Task ID: ${taskId}</p>
          </div>
          <p>Please confirm or reassign this task before <strong>${deadline}</strong>. If no action is taken, it will be automatically confirmed.</p>
          <a href="${taskUrl}" style="display:inline-block;background:#1a4031;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">
            Review Task
          </a>
          <p style="margin-top:24px;color:#7a7a62;font-size:13px">— The Betterinu Team</p>
        </div>
      `,
    })
  } catch (err) {
    // Notification failure must never block the claim
    console.error("[task-self-assign] Email notification failed:", err)
  }
}

// ---------------------------------------------------------------------------
// claimBacklogTask
// ---------------------------------------------------------------------------

export type ClaimResult =
  | { ok: true; taskId: string }
  | { ok: false; error: string }

/**
 * Claims an unassigned task from the backlog for `claimantAdminAccountId`.
 *
 * Sets:
 *   assigned_to                  = claimantAdminAccountId
 *   self_assigned                = TRUE
 *   self_assign_approval_status  = 'pending'
 *   self_assign_notified_at      = NOW()
 *   self_assign_deadline         = NOW() + INTERVAL '48 hours'
 *
 * Then notifies the task's original assigned_by admin (or department manager)
 * via email and logs the change to task_audit_log.
 *
 * Fails if the task is already assigned, is disabled, or does not exist.
 */
export async function claimBacklogTask(
  taskId: string,
  claimantAdminAccountId: string
): Promise<ClaimResult> {
  // Fetch the task and claimant details in one round-trip
  const [taskRows, claimantRows] = await Promise.all([
    sql`
      SELECT
        t.id,
        t.task_id,
        t.title,
        t.is_active,
        t.assigned_to,
        t.assigned_by,
        t.department_id,
        t.self_assigned,
        -- Original assigner's email/name for notification
        aa_assigner.email  AS assigner_email,
        aa_assigner.full_name AS assigner_name,
        -- Department head's admin account email (fallback notification target)
        aa_head.email  AS dept_head_email,
        aa_head.full_name AS dept_head_name
      FROM tasks t
      LEFT JOIN admin_accounts aa_assigner ON aa_assigner.id = t.assigned_by
      LEFT JOIN departments d              ON d.id = t.department_id
      LEFT JOIN employees emp_head         ON emp_head.id = d.head_employee_id
      LEFT JOIN admin_accounts aa_head     ON aa_head.id = emp_head.admin_account_id
      WHERE t.id = ${taskId}
      LIMIT 1
    `,
    sql`
      SELECT aa.id, aa.full_name, aa.email
      FROM admin_accounts aa
      WHERE aa.id = ${claimantAdminAccountId}
      LIMIT 1
    `,
  ])

  if (!taskRows.length) return { ok: false, error: "Task not found" }
  if (!claimantRows.length) return { ok: false, error: "Claimant not found" }

  const task = taskRows[0]
  const claimant = claimantRows[0]

  if (!task.is_active) return { ok: false, error: "Task is disabled" }
  if (task.assigned_to) {
    return { ok: false, error: "Task is already assigned to someone" }
  }

  // Compute 48-hour deadline
  const deadlineAt = new Date(Date.now() + 48 * 60 * 60 * 1000)

  // Update the task
  await sql`
    UPDATE tasks SET
      assigned_to                 = ${claimantAdminAccountId},
      self_assigned               = TRUE,
      self_assign_approval_status = 'pending',
      self_assign_notified_at     = NOW(),
      self_assign_deadline        = ${deadlineAt.toISOString()},
      updated_at                  = NOW()
    WHERE id = ${taskId}
  `

  // Write audit row synchronously
  await logTaskChange({
    taskId,
    changedBy: claimantAdminAccountId,
    fieldName: "assigned_to",
    oldValue: null,
    newValue: claimant.full_name as string,
    action: "self_assigned",
  })

  // Determine notification recipient: original assigner → department head → skip
  const notifyEmail =
    (task.assigner_email as string | null) ||
    (task.dept_head_email as string | null)
  const notifyName =
    (task.assigner_name as string | null) ||
    (task.dept_head_name as string | null)

  if (notifyEmail && notifyName) {
    // Fire-and-forget — errors are caught inside sendSelfAssignNotification
    sendSelfAssignNotification({
      toEmail: notifyEmail,
      toName: notifyName,
      claimantName: claimant.full_name as string,
      taskId: task.task_id as string,
      taskTitle: task.title as string,
      deadlineAt,
    })
  }

  // Determine the notification recipient admin account id
  const notifyAdminId =
    (task.assigned_by as string | null) ||
    // If no assigner, look up the dept head's admin_account_id inline
    (await (async () => {
      if (!task.department_id) return null
      const rows = await sql`
        SELECT aa.id
        FROM departments d
        JOIN employees emp_head    ON emp_head.id = d.head_employee_id
        JOIN admin_accounts aa     ON aa.id = emp_head.admin_account_id
        WHERE d.id = ${task.department_id as string}
        LIMIT 1
      `
      return rows[0]?.id ?? null
    })())

  if (notifyAdminId && notifyAdminId !== claimantAdminAccountId) {
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL || "https://betterinu-learn.vercel.app"
    const deadline48 = new Date(Date.now() + 48 * 60 * 60 * 1000)
    const deadlineStr = deadline48.toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Kolkata",
    })
    await sql`
      INSERT INTO task_notifications
        (recipient_id, task_id, claimant_id, message, action_url, is_read)
      VALUES (
        ${notifyAdminId as string},
        ${taskId},
        ${claimantAdminAccountId},
        ${`${claimant.full_name as string} has claimed task ${task.task_id as string} — "${task.title as string}". You have until ${deadlineStr} to reassign if needed.`},
        ${`${appUrl}/admin/tasks/${taskId}`},
        FALSE
      )
    `.catch((err: unknown) => {
      // Non-fatal — notification failure must never block the claim
      console.error("[task-self-assign] DB notification insert failed:", err)
    })
  }

  return { ok: true, taskId }
}
