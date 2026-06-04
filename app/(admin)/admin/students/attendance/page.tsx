import { redirect } from "next/navigation";
import { CalendarDays } from "lucide-react";
import { getPageSession } from "@/lib/server-session";
import { StudentAttendanceView } from "@/components/admin/students/student-attendance-view";

import { hasPermission } from "@/lib/permissions";

export default async function StudentAttendancePage() {
  const session = await getPageSession();
  if (!session) redirect("/admin/login");

  const isSuperOrDev = session.roles.includes("super_admin") || session.roles.includes("developer");
  const canMark = isSuperOrDev || hasPermission(session.role, session.permissions, "attendance", "create");
  const canEdit = isSuperOrDev || hasPermission(session.role, session.permissions, "attendance", "edit");

  return (
    <div className="w-full min-h-screen bg-subtle px-6 lg:px-10 py-10">
      <div className="mb-8">

        <div className="flex items-center gap-3 mb-1">
          <CalendarDays className="size-6 text-primary" />
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
            Student Attendance
          </h1>
        </div>
        <p className="text-sm text-secondary">
          Track and manage daily student attendance. Sundays are automatically marked as holidays.
        </p>
      </div>

      <StudentAttendanceView canMark={canMark} canEdit={canEdit} />
    </div>
  );
}
