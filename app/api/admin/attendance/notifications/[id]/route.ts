import { NextRequest, NextResponse } from "next/server";
import { resolveSession } from "@/lib/admin-rbac";
import { sql } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await resolveSession(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { id } = await params;

  await sql`
    UPDATE attendance_notifications
    SET is_read = TRUE
    WHERE id = ${id} AND recipient_id = ${session.adminId}
  `;

  return NextResponse.json({ success: true });
}
