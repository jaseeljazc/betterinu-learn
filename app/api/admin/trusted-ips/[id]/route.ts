import { NextRequest, NextResponse } from "next/server";
import { resolveSession } from "@/lib/admin-rbac";
import { sql } from "@/lib/db";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await resolveSession(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { id } = await params;

  const result = await sql`
    DELETE FROM trusted_ips WHERE id = ${id}
  `;

  // Note: Neon serverless returns affected row count differently, 
  // but a simple check or just returning ok is standard if we assume valid ID from UI.
  // To be safe, we can check if it existed, but for simplicity:
  return NextResponse.json({ ok: true });
}
