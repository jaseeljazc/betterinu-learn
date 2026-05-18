import Link from "next/link";
import { Plus, Trash2, Eye, Users } from "lucide-react";
import { sql } from "@/lib/db";
import { cookies } from "next/headers";
import { hasPermission } from "@/lib/permissions";

async function getStudents() {
  return sql`
    SELECT
      s.id, s.name, s.email, s.created_at,
      COUNT(sc.id)::int AS course_count
    FROM students s
    LEFT JOIN student_courses sc ON sc.student_id = s.id
    GROUP BY s.id, s.name, s.email, s.created_at
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
    } catch {}
  }

  return (
    <div className="w-full min-h-screen bg-subtle px-6 lg:px-10 py-10">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Users className="size-6 text-primary" />
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-foreground">
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

      <div className="overflow-hidden rounded-2xl border border-default bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-default bg-subtle">
            <tr>
              {["Name", "Email", "Courses", "Joined", "Actions"].map((h) => (
                <th key={h} className="px-5 py-3 text-left text-xs font-bold uppercase tracking-widest text-muted">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-default">
            {students.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-muted font-medium">
                  No students yet.{" "}
                  {canCreate && (
                    <Link href="/admin/students/new" className="font-semibold text-primary hover:underline">
                      Add the first one →
                    </Link>
                  )}
                </td>
              </tr>
            ) : (
              students.map((s) => (
                <tr key={s.id as string} className="hover:bg-subtle/50 transition-colors">
                  <td className="px-5 py-3 font-semibold text-foreground">{s.name as string}</td>
                  <td className="px-5 py-3 text-secondary">{s.email as string}</td>
                  <td className="px-5 py-3">
                    <span className="inline-flex size-6 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                      {s.course_count as number}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-secondary">
                    {new Date(s.created_at as string).toLocaleDateString("en-GB", {
                      day: "numeric", month: "short", year: "numeric",
                    })}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/admin/students/${s.id}`}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-default bg-white px-3 py-1.5 text-xs font-semibold text-secondary transition-colors hover:border-primary hover:text-primary"
                      >
                        <Eye className="size-3.5" />
                        View
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
