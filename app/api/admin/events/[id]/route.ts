import { NextRequest, NextResponse } from "next/server";
import { resolveSession } from "@/lib/admin-rbac";
import { sql } from "@/lib/db";

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await resolveSession(req);
  if (!session) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  try {
    const { title, description, date, time, location } = await req.json();
    const params = await context.params;
    const { id } = params;

    const rows = await sql`
      UPDATE institution_events
      SET 
        title = COALESCE(${title}, title),
        description = COALESCE(${description}, description),
        date = COALESCE(${date}::date, date),
        time = COALESCE(${time}, time),
        location = COALESCE(${location}, location),
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING id, title, description, date::text, time, location, updated_at
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    return NextResponse.json({ event: rows[0] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await resolveSession(req);
  if (!session) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  try {
    const params = await context.params;
    const { id } = params;

    const rows = await sql`
      DELETE FROM institution_events
      WHERE id = ${id}
      RETURNING id
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
