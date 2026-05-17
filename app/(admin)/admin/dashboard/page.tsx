import Link from "next/link";
import { LayoutDashboard, BookOpen, TrendingUp, Users, ClipboardList, BookMarked, Clock } from "lucide-react";
import { DashboardRow } from "./dashboard-row";
import { sql } from "@/lib/db";

async function getStats() {
  const [students, courses, assignments, courseSubmissions, standaloneSubmissions] = await Promise.all([
    sql`SELECT COUNT(*)::int AS count FROM students`,
    sql`SELECT COUNT(*)::int AS count FROM courses WHERE is_active = true`,
    sql`SELECT COUNT(*)::int AS count FROM student_courses`,
    sql`
      SELECT
        s.id,
        s.assignment_id,
        s.submitted_at,
        s.status,
        st.name AS student_name,
        c.title AS course_title,
        'course' AS submission_type
      FROM assignment_submissions s
      JOIN students st ON st.id = s.student_id
      JOIN courses  c  ON c.id  = s.course_id
      ORDER BY s.submitted_at DESC
      LIMIT 10
    `,
    sql`
      SELECT
        sub.id,
        sub.assignment_id,
        sub.submitted_at,
        sub.status,
        st.name  AS student_name,
        sa.title AS course_title,
        'standalone' AS submission_type
      FROM standalone_assignment_submissions sub
      JOIN students st ON st.id = sub.student_id
      JOIN standalone_assignments sa ON sa.id = sub.assignment_id
      ORDER BY sub.submitted_at DESC
      LIMIT 10
    `,
  ]);

  // Merge and sort by submitted_at descending, keep top 10
  const allSubmissions = [...courseSubmissions, ...standaloneSubmissions]
    .sort((a, b) => new Date(b.submitted_at as string).getTime() - new Date(a.submitted_at as string).getTime())
    .slice(0, 10);

  return {
    students: students[0].count as number,
    courses:  courses[0].count  as number,
    assignments: assignments[0].count as number,
    recentSubmissions: allSubmissions,
  };
}

const statusConfig: Record<string, { label: string; className: string }> = {
  pending:  { label: "Pending",  className: "bg-amber-100 text-amber-700 border-amber-200" },
  approved: { label: "Approved", className: "bg-green-100 text-green-700 border-green-200" },
  rejected: { label: "Revise",   className: "bg-red-100 text-red-700 border-red-200" },
};

export default async function AdminDashboard() {
  const stats = await getStats();

  const cards = [
    { label: "Total Students",    value: stats.students,    Icon: Users,       color: "bg-blue-50   text-blue-600" },
    { label: "Active Courses",    value: stats.courses,     Icon: BookOpen,    color: "bg-green-50  text-[#1a4031]" },
    { label: "Total Assignments", value: stats.assignments, Icon: TrendingUp,  color: "bg-amber-50  text-amber-600" },
  ];

  return (
    <div className="w-full min-h-screen bg-subtle px-6 lg:px-10 py-10">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <LayoutDashboard className="size-6 text-primary" />
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-foreground">
            Dashboard
          </h1>
        </div>
        <p className="text-sm text-secondary">Overview of your LMS activity.</p>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map(({ label, value, Icon, color }) => (
          <div key={label} className="rounded-2xl border border-default bg-white p-5 shadow-sm">
            <div className={`inline-flex size-10 items-center justify-center rounded-lg ${color}`}>
              <Icon className="size-5" />
            </div>
            <p className="mt-4 text-3xl font-bold text-foreground">{value}</p>
            <p className="mt-1 text-sm font-semibold text-secondary">{label}</p>
          </div>
        ))}
      </div>

      {/* Recent Submissions */}
      <div className="mt-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <ClipboardList className="size-5 text-primary" />
            Latest Submissions
          </h2>
          <div className="flex gap-2">
            <Link href="/admin/submissions" className="text-xs font-semibold text-primary hover:underline">
              View course submissions →
            </Link>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-default bg-white shadow-sm">
          {stats.recentSubmissions.length === 0 ? (
            <div className="px-6 py-12 text-center text-muted font-medium">
              No submissions yet.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-default bg-subtle">
                <tr>
                  {["Student", "Assignment / Task", "Type", "Status", "Submitted"].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-bold uppercase tracking-widest text-muted">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-default">
                {stats.recentSubmissions.map((row, i) => {
                  const status = statusConfig[row.status as string] ?? { label: row.status as string, className: "bg-gray-100 text-gray-600 border-gray-200" };
                  return (
                    <DashboardRow key={i} row={row} status={status} />
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}


