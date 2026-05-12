import { NextRequest, NextResponse } from "next/server";
import { extractToken, verifyStudentToken } from "@/lib/auth";
import { sql } from "@/lib/db";

/**
 * GET /api/student/profile
 * Returns the authenticated student's name, email, and created_at.
 */
export async function GET(req: NextRequest) {
  const token = extractToken(req.headers.get("authorization")) ?? req.cookies.get("__session")?.value ?? "";
  const student = await verifyStudentToken(token);
  if (!student) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const rows = await sql`
    SELECT name, email, created_at FROM students WHERE id = ${student.studentId}
  `;

  if (!rows.length) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(rows[0]);
}
