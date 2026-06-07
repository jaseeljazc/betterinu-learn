import { NextRequest, NextResponse } from "next/server";
import { extractToken, verifyStudentToken } from "@/lib/auth";
import { sql } from "@/lib/db";

/**
 * GET /api/student/course-assignments
 * Returns all course-embedded assignment submissions for the logged-in student,
 * with assignment title resolved from course_weeks (new) or curriculum JSON (legacy).
 * Also returns module_id and week_id so the UI can build a deep-link to the lesson.
 */
export async function GET(req: NextRequest) {
  const token =
    extractToken(req.headers.get("authorization")) ??
    req.cookies.get("__session")?.value ??
    "";
  const student = await verifyStudentToken(token);
  if (!student)
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const rows = await sql`
    SELECT
      s.id            AS submission_id,
      s.assignment_id,
      s.course_id,
      s.week_id,
      s.day_id,
      s.submitted_text,
      s.submitted_files,
      s.submitted_at,
      s.status        AS submission_status,
      s.feedback,
      s.reviewed_at,
      s.marks_obtained,
      c.title         AS course_title,
      c.curriculum    AS course_curriculum
    FROM assignment_submissions s
    JOIN courses c ON c.id = s.course_id
    WHERE s.student_id = ${student.studentId}
    ORDER BY s.submitted_at DESC
  `;

  // Collect unique week_ids that need resolving from course_weeks
  const weekIds = [...new Set(rows.map((r) => r.week_id as string).filter(Boolean))];

  // Batch-fetch all relevant course_weeks rows
  const weekRows: { id: string; days: any }[] =
    weekIds.length > 0
      ? await sql`
          SELECT id, days
          FROM course_weeks
          WHERE id = ANY(${weekIds})
        `
      : [];

  // Build lookup: weekId → days array
  const weekDaysMap: Record<string, any[]> = {};
  for (const w of weekRows) {
    weekDaysMap[w.id] = Array.isArray(w.days) ? w.days : [];
  }

  // Resolve assignment title and module_id for each submission
  const assignments = rows.map((row) => {
    let title = row.assignment_id as string;
    let dueDate: string | null = null;
    let moduleId: string | null = null;

    // ── 1. Try course_weeks (new three-panel builder) ──────────────────────
    const days = weekDaysMap[row.week_id as string] ?? [];
    outer1: for (const day of days) {
      for (const mod of day.subModules ?? []) {
        if (mod.id === row.assignment_id) {
          title =
            mod.assignmentData?.title ||
            mod.title ||
            row.assignment_id;
          dueDate = mod.assignmentData?.dueDate ?? null;
          moduleId = mod.id;
          break outer1;
        }
      }
    }

    // ── 2. Fallback: legacy curriculum JSON ───────────────────────────────
    if (moduleId === null && row.course_curriculum && Array.isArray(row.course_curriculum)) {
      outer2: for (const week of row.course_curriculum) {
        if (!week.days) continue;
        for (const day of week.days) {
          if (!day.subModules) continue;
          for (const mod of day.subModules) {
            if (mod.id === row.assignment_id) {
              title =
                mod.assignmentData?.title ||
                mod.title ||
                row.assignment_id;
              dueDate = mod.assignmentData?.dueDate ?? null;
              moduleId = mod.id;
              break outer2;
            }
          }
        }
      }
    }

    const { course_curriculum, ...rest } = row;
    return {
      ...rest,
      title,
      due_date: dueDate,
      module_id: moduleId ?? row.assignment_id,
      scope: "course" as const,
    };
  });

  return NextResponse.json({ assignments });
}
