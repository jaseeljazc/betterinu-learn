import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requirePermission } from "@/lib/admin-rbac"

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(req, "payroll_runs", "edit")
  if (auth instanceof NextResponse) return auth

  const { id } = await params
  const { status } = await req.json()

  if (!status) {
    return NextResponse.json({ error: "status is required" }, { status: 400 })
  }

  const validStatuses = ["draft", "approved", "on_hold"]
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` }, { status: 400 })
  }

  const rows = await sql`
    SELECT id, status FROM payroll_runs WHERE id = ${id} LIMIT 1
  `
  if (!rows.length) return NextResponse.json({ error: "Payroll run not found" }, { status: 404 })

  if (rows[0].status === "disbursed") {
    return NextResponse.json({ error: "Cannot modify a disbursed payroll run" }, { status: 400 })
  }

  await sql`
    UPDATE payroll_runs SET
      status = ${status},
      updated_at = NOW()
    WHERE id = ${id}
  `

  return NextResponse.json({ ok: true })
}
