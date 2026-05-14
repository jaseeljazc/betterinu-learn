import { NextRequest, NextResponse } from "next/server";
import { extractToken, verifyStudentToken } from "@/lib/auth";
import { sql } from "@/lib/db";

export async function GET(req: NextRequest) {
  const token = extractToken(req.headers.get("authorization")) ?? req.cookies.get("__session")?.value ?? "";
  const student = await verifyStudentToken(token);
  if (!student) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const rows = await sql`
    SELECT progress_state FROM students WHERE id = ${student.studentId}
  `;

  if (rows.length === 0 || !rows[0].progress_state) {
    return NextResponse.json({ progress: null });
  }

  return NextResponse.json({ progress: rows[0].progress_state });
}

export async function POST(req: NextRequest) {
  const token = extractToken(req.headers.get("authorization")) ?? req.cookies.get("__session")?.value ?? "";
  const student = await verifyStudentToken(token);
  if (!student) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const body = await req.json();
  if (!body.progress) {
    return NextResponse.json({ error: "Missing progress data" }, { status: 400 });
  }

  await sql`
    UPDATE students 
    SET progress_state = ${body.progress}::jsonb
    WHERE id = ${student.studentId}
  `;

  return NextResponse.json({ ok: true });
}
