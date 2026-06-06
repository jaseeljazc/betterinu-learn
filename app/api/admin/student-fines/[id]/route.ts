import { NextRequest, NextResponse } from "next/server";
import { resolveSession } from "@/lib/admin-rbac";
import { sql } from "@/lib/db";

/**
 * PATCH /api/admin/student-fines/[id]
 * Body: { action: "paid" | "waived", waive_reason?: string }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await resolveSession(req);
  if (!session) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { action, waive_reason } = body as { action?: string; waive_reason?: string };

  if (action !== "paid" && action !== "waived") {
    return NextResponse.json({ error: "action must be 'paid' or 'waived'" }, { status: 400 });
  }

  try {
    const updated = await sql`
      UPDATE student_leave_fines
      SET
        status       = ${action},
        waive_reason = ${action === "waived" ? (waive_reason?.trim() || null) : null},
        resolved_by  = ${session.adminId},
        resolved_at  = NOW(),
        updated_at   = NOW()
      WHERE id = ${id} AND status = 'pending'
      RETURNING id
    `;
    if (updated.length === 0) {
      return NextResponse.json({ error: "Fine not found or already resolved" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
