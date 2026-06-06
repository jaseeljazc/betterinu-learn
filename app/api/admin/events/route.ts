import { NextRequest, NextResponse } from "next/server";
import { resolveSession } from "@/lib/admin-rbac";
import { sql } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await resolveSession(req);
  if (!session) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  try {
    const rows = await sql`
      SELECT id, title, description, date::text, time, location, created_at
      FROM institution_events
      ORDER BY date DESC
    `;
    return NextResponse.json({ events: rows });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await resolveSession(req);
  if (!session) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  try {
    const { title, description, date, time, location } = await req.json();

    if (!title || !date) {
      return NextResponse.json({ error: "Title and date are required" }, { status: 400 });
    }

    const rows = await sql`
      INSERT INTO institution_events (title, description, date, time, location, created_by)
      VALUES (${title}, ${description || null}, ${date}, ${time || null}, ${location || null}, ${session.adminId})
      RETURNING id, title, description, date::text, time, location, created_at
    `;

    return NextResponse.json({ event: rows[0] }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
