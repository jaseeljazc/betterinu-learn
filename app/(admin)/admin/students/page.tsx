import Link from "next/link";
import { Plus, Trash2, Eye } from "lucide-react";
import { sql } from "@/lib/db";

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

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Students</h1>
          <p className="mt-1 text-sm text-[#7a7a62]">{students.length} student{students.length !== 1 ? "s" : ""} registered.</p>
        </div>
        <Link
          href="/admin/students/new"
          className="flex items-center gap-2 rounded-lg bg-[#1a4031] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          <Plus className="size-4" />
          Add Student
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl border border-[#e5e2da] bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-[#e5e2da] bg-[#f9f9f6]">
            <tr>
              {["Name", "Email", "Courses", "Joined", "Actions"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#7a7a62]">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f0ede6]">
            {students.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-[#7a7a62]">
                  No students yet.{" "}
                  <Link href="/admin/students/new" className="font-semibold text-[#1a4031] underline">
                    Add the first one →
                  </Link>
                </td>
              </tr>
            ) : (
              students.map((s) => (
                <tr key={s.id as string} className="hover:bg-[#fafaf8]">
                  <td className="px-4 py-3 font-medium">{s.name as string}</td>
                  <td className="px-4 py-3 text-[#7a7a62]">{s.email as string}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex size-6 items-center justify-center rounded-full bg-[#e8f0ec] text-xs font-bold text-[#1a4031]">
                      {s.course_count as number}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#7a7a62]">
                    {new Date(s.created_at as string).toLocaleDateString("en-GB", {
                      day: "numeric", month: "short", year: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/admin/students/${s.id}`}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#e5e2da] px-3 py-1.5 text-xs font-semibold text-[#4a4a3a] hover:border-[#1a4031] hover:text-[#1a4031]"
                      >
                        <Eye className="size-3" />
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
