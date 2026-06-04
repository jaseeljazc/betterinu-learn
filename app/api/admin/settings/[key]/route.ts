import { NextRequest, NextResponse } from "next/server";
import { resolveSession } from "@/lib/admin-rbac";
import { getSettings, upsertSettings } from "@/lib/app-settings";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  const session = await resolveSession(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { key } = await params;
  const value = await getSettings(key);
  if (value === null) {
    return NextResponse.json({ error: "Settings not found" }, { status: 404 });
  }

  return NextResponse.json({ key, value });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  const session = await resolveSession(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  // Only super_admin or developer can modify app-wide settings
  if (!session.roles.includes("super_admin") && !session.roles.includes("developer")) {
    return NextResponse.json({ error: "Forbidden: Super admin or Developer privilege required" }, { status: 403 });
  }

  const { key } = await params;
  const body = await req.json();
  const { value, category, description } = body;

  if (value === undefined || !category) {
    return NextResponse.json(
      { error: "value and category are required fields" },
      { status: 400 }
    );
  }

  try {
    await upsertSettings(key, category, value, session.adminId, description);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error(`Failed to update settings for key ${key}:`, err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
