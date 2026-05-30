import { NextRequest, NextResponse } from "next/server"
import { resolveSession } from "@/lib/admin-rbac"
import { extractToken, verifyStudentToken } from "@/lib/auth"
import { getReceiptDetails } from "@/lib/services/receipt-service"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ paymentLogId: string }> }
) {
  const { paymentLogId } = await params

  try {
    let isAdmin = false
    let isStudent = false
    let studentId = ""

    // 1. Try to authenticate as Admin
    const adminSession = await resolveSession(req)
    if (adminSession) {
      isAdmin = true
    } else {
      // 2. Try to authenticate as Student
      const authHeader = req.headers.get("authorization")
      const sessionCookie = req.cookies.get("__session")?.value
      const token = extractToken(authHeader) ?? sessionCookie ?? ""

      const studentSession = await verifyStudentToken(token)
      if (studentSession) {
        isStudent = true
        studentId = studentSession.studentId
      }
    }

    if (!isAdmin && !isStudent) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // 3. Fetch receipt details (includes auto-generation of receipt_number)
    const details = await getReceiptDetails(paymentLogId)
    if (!details) {
      return NextResponse.json({ error: "Receipt not found" }, { status: 404 })
    }

    // 4. Enforce authorization boundary for student requests
    if (isStudent && details.receipt.studentId !== studentId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    return NextResponse.json(details)
  } catch (err: any) {
    const msg = err instanceof Error ? err.message : "Database error"
    if (msg.includes("waiver or adjustment")) {
      return NextResponse.json({ error: msg }, { status: 400 })
    }
    console.error(`[GET /api/receipts/${paymentLogId}] Error:`, msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
