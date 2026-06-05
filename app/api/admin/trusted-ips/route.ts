import { NextRequest, NextResponse } from "next/server";
import { resolveSession } from "@/lib/admin-rbac";
import { sql } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await resolveSession(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const rows = await sql`
    SELECT id, label, ip_range, created_at
    FROM trusted_ips
    ORDER BY created_at DESC
  `;

  return NextResponse.json({ trustedIps: rows });
}

export async function POST(req: NextRequest) {
  const session = await resolveSession(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const body = await req.json();
  const { label, ip_range } = body;

  if (!label || !ip_range) {
    return NextResponse.json({ error: "label and ip_range are required" }, { status: 400 });
  }

  try {
    const rows = await sql`
      INSERT INTO trusted_ips (label, ip_range, created_by)
      VALUES (${label}, ${ip_range}, ${session.adminId})
      RETURNING id
    `;
    return NextResponse.json({ ok: true, id: rows[0].id }, { status: 201 });
  } catch (err: any) {
    if (err.code === "23505") { // Unique violation
      return NextResponse.json({ error: "This IP is already trusted" }, { status: 409 });
    }
    console.error("Failed to add trusted IP:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
