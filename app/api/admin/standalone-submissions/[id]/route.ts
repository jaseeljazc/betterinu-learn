import { NextRequest, NextResponse } from "next/server";
import { extractToken, verifyAdminToken } from "@/lib/auth";
import { sql } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/admin/standalone-submissions/[id]
 * Body: { action: 'approve' | 'reject', feedback?: string }
 * Approves or rejects a standalone assignment submission.
 * NOTE: Does NOT touch student_progress — fully independent system.
 */
export async function POST(req: NextRequest, { params }: Params) {
  const token =
    extractToken(req.headers.get("authorization")) ??
    req.cookies.get("__session")?.value ??
    "";
  const admin = await verifyAdminToken(token);
  if (!admin)
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { id } = await params;
  const { action, feedback = "" } = await req.json().catch(() => ({ action: "approve", feedback: "" }));

  if (!["approve", "reject"].includes(action))
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  const rows = await sql`SELECT id FROM standalone_assignment_submissions WHERE id = ${id} LIMIT 1`;
  if (!rows.length)
    return NextResponse.json({ error: "Submission not found" }, { status: 404 });

  await sql`
    UPDATE standalone_assignment_submissions SET
      status      = ${action === "approve" ? "approved" : "rejected"},
      feedback    = ${feedback || null},
      reviewed_at = NOW(),
      reviewed_by = ${admin.adminId}
    WHERE id = ${id}
  `;

  return NextResponse.json({ ok: true });
}
