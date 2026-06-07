import { NextRequest, NextResponse } from "next/server";
import { extractToken, verifyAdminToken } from "@/lib/auth";
import { sql } from "@/lib/db";

/**
 * GET /api/admin/assignments
 * Returns all student assignment submissions across all courses,
 * joined with student name and course title.
 * Resolves assignment title + data from course_weeks (new) then falls back
 * to the legacy curriculum JSON column.
 */
export async function GET(req: NextRequest) {
  const token =
    extractToken(req.headers.get("authorization")) ??
    req.cookies.get("__session")?.value ??
    "";
  if (!(await verifyAdminToken(token)))
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const studentId = searchParams.get("studentId");

  let rows;
  if (studentId) {
    rows = await sql`
      SELECT
        s.id          AS id,
        s.assignment_id,
        s.course_id,
        s.week_id,
        s.day_id,
        s.submitted_text,
        s.submitted_files,
        s.submitted_at,
        s.status,
        s.feedback,
        s.reviewed_at,
        s.marks_obtained,
        st.name       AS student_name,
        st.email      AS student_email,
        st.id         AS student_id,
        c.title       AS course_title,
        c.curriculum  AS course_curriculum
      FROM assignment_submissions s
      JOIN students st ON st.id = s.student_id
      JOIN courses  c  ON c.id  = s.course_id
      WHERE s.student_id = ${studentId}
      ORDER BY s.submitted_at DESC
    `;
  } else {
    rows = await sql`
      SELECT
        s.id          AS id,
        s.assignment_id,
        s.course_id,
        s.week_id,
        s.day_id,
        s.submitted_text,
        s.submitted_files,
        s.submitted_at,
        s.status,
        s.feedback,
        s.reviewed_at,
        s.marks_obtained,
        st.name       AS student_name,
        st.email      AS student_email,
        st.id         AS student_id,
        c.title       AS course_title,
        c.curriculum  AS course_curriculum
      FROM assignment_submissions s
      JOIN students st ON st.id = s.student_id
      JOIN courses  c  ON c.id  = s.course_id
      ORDER BY s.submitted_at DESC
    `;
  }

  // Batch-fetch course_weeks rows for all week_ids in one query
  const weekIds = [...new Set(rows.map((r) => r.week_id as string).filter(Boolean))];
  const weekRows: { id: string; days: any }[] =
    weekIds.length > 0
      ? (await sql`SELECT id, days FROM course_weeks WHERE id = ANY(${weekIds})`) as { id: string; days: any }[]
      : [];

  const weekDaysMap: Record<string, any[]> = {};
  for (const w of weekRows) {
    weekDaysMap[w.id] = Array.isArray(w.days) ? w.days : [];
  }

  const mappedRows = rows.map((row) => {
    let assignmentTitle = "";
    let assignmentData: any = null;

    // ── 1. Try course_weeks (three-panel builder) ─────────────────────────
    const days = weekDaysMap[row.week_id as string] ?? [];
    outer1: for (const day of days) {
      for (const mod of day.subModules ?? []) {
        if (mod.id === row.assignment_id) {
          assignmentData = mod.assignmentData ?? null;
          assignmentTitle =
            mod.assignmentData?.title || mod.title || row.assignment_id;
          break outer1;
        }
      }
    }

    // ── 2. Fallback: legacy curriculum JSON ──────────────────────────────
    if (!assignmentData && row.course_curriculum && Array.isArray(row.course_curriculum)) {
      outer2: for (const week of row.course_curriculum) {
        if (!week.days) continue;
        for (const day of week.days) {
          if (!day.subModules) continue;
          for (const mod of day.subModules) {
            if (mod.id === row.assignment_id) {
              assignmentData = mod.assignmentData ?? null;
              assignmentTitle =
                mod.assignmentData?.title || mod.title || row.assignment_id;
              break outer2;
            }
            // Legacy task sections embedded inside a lesson module
            if (mod.sections && Array.isArray(mod.sections)) {
              for (const sec of mod.sections) {
                if (sec.id === row.assignment_id && sec.type === "task") {
                  assignmentData = { description: sec.description, title: sec.title };
                  assignmentTitle = sec.title || row.assignment_id;
                  break outer2;
                }
              }
            }
          }
        }
      }
    }

    if (!assignmentTitle) assignmentTitle = row.assignment_id;
    const { course_curriculum, ...rest } = row;
    return { ...rest, assignment_title: assignmentTitle, assignment_data: assignmentData };
  });

  return NextResponse.json({ submissions: mappedRows });
}
