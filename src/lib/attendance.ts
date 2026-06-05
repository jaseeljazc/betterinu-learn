/**
 * lib/attendance.ts — Server-only module for student attendance logic.
 * Never import in client components.
 */
import { NextRequest } from "next/server";
import { sql } from "@/lib/db";

export function getClientIp(req: NextRequest): string {
  // Next.js provides the IP directly, normalized from x-forwarded-for or connection
  let ip = (req as any).ip || "unknown";

  // Fallback to headers if req.ip is not available
  if (ip === "unknown") {
    const forwarded = req.headers.get("x-forwarded-for");
    if (forwarded) {
      ip = forwarded.split(",")[0].trim();
    } else {
      const realIp = req.headers.get("x-real-ip");
      if (realIp) {
        ip = realIp.trim();
      }
    }
  }

  // Map IPv6 loopback to IPv4 loopback for cleaner local dev display
  if (ip === "::1") {
    return "127.0.0.1";
  }

  return ip;
}

export async function checkIpTrusted(ip: string): Promise<boolean> {
  if (ip === "unknown") return false;
  const rows = await sql`
    SELECT 1 FROM trusted_ips WHERE ip_range = ${ip} LIMIT 1
  `;
  return rows.length > 0;
}

export async function notifyAdminsUnknownIp({
  studentId,
  studentName,
  ip,
  attendanceId,
}: {
  studentId: string;
  studentName: string;
  ip: string;
  attendanceId: string;
}): Promise<void> {
  try {
    const admins = await sql`
      SELECT DISTINCT aa.id
      FROM admin_accounts aa
      JOIN admin_account_roles aar ON aar.admin_account_id = aa.id
      JOIN admin_roles ar ON ar.id = aar.role_id
      WHERE aa.status = 'active'
        AND ar.name IN ('super_admin', 'instructor', 'hr_manager')
    `;

    if (admins.length === 0) return;

    const message = `⚠️ ${studentName} punched in from an unknown IP address (${ip}).`;
    const actionUrl = "/admin/students/attendance?tab=flagged";

    for (const admin of admins) {
      await sql`
        INSERT INTO attendance_notifications (
          recipient_id, attendance_id, student_id, message, action_url, ip_address, is_read
        ) VALUES (
          ${admin.id}, ${attendanceId}, ${studentId}, ${message}, ${actionUrl}, ${ip}, FALSE
        )
      `;
    }
  } catch (err) {
    console.error("attendance notifyAdmins:", err);
  }
}
