import Link from "next/link";
import { Plus, Trash2, Eye, Users } from "lucide-react";
import { sql } from "@/lib/db";
import { cookies } from "next/headers";
import { hasPermission } from "@/lib/permissions";
import { StudentsTable } from "@/components/admin/students-table";

async function getStudents() {
  return sql`
    SELECT
      s.id, s.name, s.email, s.created_at, s.status,
      COUNT(sc.id)::int AS course_count
    FROM students s
    LEFT JOIN student_courses sc ON sc.student_id = s.id
    GROUP BY s.id, s.name, s.email, s.created_at, s.status
    ORDER BY s.created_at DESC
  `;
}

export default async function AdminStudentsPage() {
  const students = await getStudents();

  const cookieStore = await cookies();
  const rbacStr = cookieStore.get("__rbac")?.value;
  let canCreate = false;
  if (rbacStr) {
    try {
      const payload = JSON.parse(decodeURIComponent(rbacStr));
      canCreate = hasPermission(payload.role, payload.permissions || [], "students", "create");
    } catch { }
  }

  return (
    <div className="w-full min-h-screen bg-subtle px-6 lg:px-10 py-10">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Users className="size-6 text-primary" />
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
              Students
            </h1>
          </div>
          <p className="text-sm text-secondary">
            {students.length} student{students.length !== 1 ? "s" : ""} registered.
          </p>
        </div>
        {canCreate && (
          <Link
            href="/admin/students/new"
            className="flex shrink-0 items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-all shadow-sm hover:shadow-md"
          >
            <Plus className="size-4" /> Add Student
          </Link>
        )}
      </div>

      {students.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-default bg-white py-20 text-center shadow-sm">
          <Users className="size-10 text-muted mb-4" />
          <h3 className="text-lg font-bold text-foreground">No students yet</h3>
          {canCreate && (
            <Link
              href="/admin/students/new"
              className="mt-6 flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-all shadow-sm"
            >
              <Plus className="size-4" /> Create First Student
            </Link>
          )}
        </div>
      ) : (
        <StudentsTable
          students={students as any}
          canCreate={canCreate}
        />
      )}
    </div>
  );
}
