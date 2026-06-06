import { NextRequest, NextResponse } from "next/server";
import { resolveSession } from "@/lib/admin-rbac";
import { getSettings, upsertSettings, DEFAULT_LEAVE_FINE_SETTINGS } from "@/lib/app-settings";
import type { StudentLeaveFineSettings } from "@/lib/app-settings";

export async function GET(req: NextRequest) {
  const session = await resolveSession(req);
  if (!session) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  try {
    const settings = await getSettings<StudentLeaveFineSettings>("student_leave_fines");
    return NextResponse.json(settings ?? DEFAULT_LEAVE_FINE_SETTINGS);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await resolveSession(req);
  if (!session) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  try {
    const body = await req.json() as StudentLeaveFineSettings;

    // Prevent negative fine amounts and leave quotas
    if (
      (typeof body.fine_amount === "number" && body.fine_amount < 0) ||
      (typeof body.absent_fine_amount === "number" && body.absent_fine_amount < 0) ||
      (typeof body.free_leaves_per_period === "number" && body.free_leaves_per_period < 0)
    ) {
      return NextResponse.json({ error: "Fine amounts and leave quotas cannot be negative" }, { status: 400 });
    }

    await upsertSettings("student_leave_fines", "attendance", body, session.adminId);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
