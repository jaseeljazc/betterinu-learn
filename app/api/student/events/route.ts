import { NextRequest, NextResponse } from "next/server";
import { verifyStudentToken, extractToken } from "@/lib/auth";
import { sql } from "@/lib/db";

export async function GET(req: NextRequest) {
  const token =
    extractToken(req.headers.get("authorization")) ??
    req.cookies.get("__session")?.value ??
    "";
  if (!token) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const student = await verifyStudentToken(token);
  if (!student) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  try {
    const rows = await sql`
      SELECT id, title, description, date::text, time, location
      FROM institution_events
      WHERE date >= CURRENT_DATE
      ORDER BY date ASC
      LIMIT 5
    `;
    return NextResponse.json({ events: rows });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
