import { NextRequest, NextResponse } from "next/server";
import { resolveSession } from "@/lib/admin-rbac";
import { sql } from "@/lib/db";
import { getStudentAttendanceSettings } from "@/lib/app-settings";

/**
 * POST /api/admin/student-attendance/mark
 * Body: { studentId, date, status, note? }
 * Marks or overrides a student's attendance for a specific day.
 *
 * DELETE /api/admin/student-attendance/mark
 * Body: { id }
 * Removes an admin override (row must have marked_by set).
 */

const VALID_STATUSES = ["Present", "Late", "Early_Checkout", "Half_Day", "Absent", "Leave", "Holiday"] as const;

export async function POST(req: NextRequest) {
  const session = await resolveSession(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const body = await req.json();
  const { studentId, date, status, note } = body as {
    studentId?: string;
    date?: string;
    status?: string;
    note?: string;
  };

  if (!studentId || !date || !status) {
    return NextResponse.json(
      { error: "studentId, date, and status are required" },
      { status: 400 }
    );
  }

  if (!VALID_STATUSES.includes(status as typeof VALID_STATUSES[number])) {
    return NextResponse.json(
      { error: `status must be one of: ${VALID_STATUSES.join(", ")}` },
      { status: 400 }
    );
  }

  // Block marking on configured weekly off days (uses global settings, not hardcoded Sunday)
  const [yr, mo, dy] = date.split("-").map(Number);
  const markSettings = await getStudentAttendanceSettings();
  const DAY_NUM: Record<string, number> = {
    sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
    thursday: 4, friday: 5, saturday: 6,
  };
  const DAY_NAME = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const weekendSet = new Set(
    (markSettings.weekend_days ?? ["sunday"]).map((d) => DAY_NUM[d.toLowerCase()] ?? -1)
  );
  const dayOfWeek = new Date(yr, mo - 1, dy).getDay();
  if (weekendSet.has(dayOfWeek)) {
    return NextResponse.json(
      { error: `Cannot manually mark ${DAY_NAME[dayOfWeek]}s — they are configured as weekly off days` },
      { status: 400 }
    );
  }

  try {
    const rows = await sql`
      INSERT INTO student_attendance (student_id, date, status, note, marked_by)
      VALUES (${studentId}, ${date}::date, ${status}, ${note ?? null}, ${session.adminId})
      ON CONFLICT (student_id, date)
      DO UPDATE SET
        status     = EXCLUDED.status,
        note       = EXCLUDED.note,
        marked_by  = EXCLUDED.marked_by,
        updated_at = NOW()
      RETURNING id
    `;

    return NextResponse.json({ ok: true, id: rows[0].id }, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/admin/student-attendance/mark:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await resolveSession(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const body = await req.json();
  if (!body.id && !(body.studentId && body.date)) {
    return NextResponse.json({ error: "id OR (studentId and date) is required" }, { status: 400 });
  }

  try {
    let deleted;
    if (body.id) {
      deleted = await sql`
        DELETE FROM student_attendance
        WHERE id = ${body.id}
          AND marked_by IS NOT NULL
        RETURNING id
      `;
    } else {
      deleted = await sql`
        DELETE FROM student_attendance
        WHERE student_id = ${body.studentId}
          AND date = ${body.date}::date
          AND marked_by IS NOT NULL
        RETURNING id
      `;
    }

    if (deleted.length === 0) {
      return NextResponse.json(
        { error: "Record not found or not an admin override" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("DELETE /api/admin/student-attendance/mark:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
