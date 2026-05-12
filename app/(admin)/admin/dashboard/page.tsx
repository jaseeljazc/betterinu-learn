import { BookOpen, TrendingUp, Users } from "lucide-react";
import { sql } from "@/lib/db";

async function getStats() {
  const [students, courses, assignments, recent] = await Promise.all([
    sql`SELECT COUNT(*)::int AS count FROM students`,
    sql`SELECT COUNT(*)::int AS count FROM courses WHERE is_active = true`,
    sql`SELECT COUNT(*)::int AS count FROM student_courses`,
    sql`
      SELECT s.name, s.email, c.title AS course_title, sc.assigned_at
      FROM student_courses sc
      JOIN students s ON s.id = sc.student_id
      JOIN courses   c ON c.id = sc.course_id
      ORDER BY sc.assigned_at DESC
      LIMIT 10
    `,
  ]);
  return {
    students: students[0].count as number,
    courses:  courses[0].count  as number,
    assignments: assignments[0].count as number,
    recent,
  };
}

export default async function AdminDashboard() {
  const stats = await getStats();

  const cards = [
    { label: "Total Students",    value: stats.students,    Icon: Users,     color: "bg-blue-50   text-blue-600" },
    { label: "Active Courses",    value: stats.courses,     Icon: BookOpen,  color: "bg-green-50  text-[#1a4031]" },
    { label: "Total Assignments", value: stats.assignments, Icon: TrendingUp, color: "bg-amber-50  text-amber-600" },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-[#7a7a62]">Overview of your LMS activity.</p>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map(({ label, value, Icon, color }) => (
          <div key={label} className="rounded-xl border border-[#e5e2da] bg-white p-5">
            <div className={`inline-flex size-10 items-center justify-center rounded-lg ${color}`}>
              <Icon className="size-5" />
            </div>
            <p className="mt-3 text-3xl font-bold">{value}</p>
            <p className="mt-1 text-sm text-[#7a7a62]">{label}</p>
          </div>
        ))}
      </div>

      {/* Recent assignments */}
      <div className="mt-8">
        <h2 className="mb-4 text-lg font-semibold">Recent Assignments</h2>
        <div className="overflow-hidden rounded-xl border border-[#e5e2da] bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-[#e5e2da] bg-[#f9f9f6]">
              <tr>
                {["Student", "Email", "Course", "Assigned"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#7a7a62]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0ede6]">
              {stats.recent.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-[#7a7a62]">
                    No assignments yet.
                  </td>
                </tr>
              ) : (
                stats.recent.map((row, i) => (
                  <tr key={i} className="hover:bg-[#fafaf8]">
                    <td className="px-4 py-3 font-medium">{row.name as string}</td>
                    <td className="px-4 py-3 text-[#7a7a62]">{row.email as string}</td>
                    <td className="px-4 py-3">{row.course_title as string}</td>
                    <td className="px-4 py-3 text-[#7a7a62]">
                      {new Date(row.assigned_at as string).toLocaleDateString("en-GB", {
                        day: "numeric", month: "short", year: "numeric",
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
