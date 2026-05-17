import Link from "next/link";
import { Pencil, Plus, BookOpen, Settings2 } from "lucide-react";
import { sql } from "@/lib/db";
import { DeleteCourseButton } from "@/components/admin/delete-course-button";

async function getCourses() {
  return sql`SELECT * FROM courses ORDER BY id`;
}

export default async function AdminCoursesPage() {
  const courses = await getCourses();

  return (
    <div className="w-full min-h-screen bg-subtle px-6 lg:px-10 py-10">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <BookOpen className="size-6 text-primary" />
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-foreground">
              Courses
            </h1>
          </div>
          <p className="text-sm text-secondary">
            Manage course metadata, descriptions, instructors, and visibility.
          </p>
        </div>
        <Link
          href="/admin/courses/new"
          className="flex shrink-0 items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-all shadow-sm hover:shadow-md"
        >
          <Plus className="size-4" /> Add Course
        </Link>
      </div>

      {courses.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-default bg-white py-20 text-center shadow-sm">
          <BookOpen className="size-10 text-muted mb-4" />
          <h3 className="text-lg font-bold text-foreground">No courses yet</h3>
          <p className="mt-1 max-w-sm text-sm text-secondary">Get started by creating your first course. You can add curriculum and modules later.</p>
          <Link
            href="/admin/courses/new"
            className="mt-6 flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-all shadow-sm"
          >
            <Plus className="size-4" /> Create First Course
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-default bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-default bg-subtle">
              <tr>
                {["Course", "Level", "Duration", "Instructor", "Status", ""].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-bold uppercase tracking-widest text-muted">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-default">
              {courses.map((course) => (
                <tr key={course.id as string} className="hover:bg-subtle/50 transition-colors">
                  <td className="px-5 py-3">
                    <p className="font-semibold text-foreground">{course.title as string}</p>
                    <p className="text-[11px] font-mono text-muted uppercase tracking-wider">{course.id as string}</p>
                  </td>
                  <td className="px-5 py-3 text-secondary">{course.level as string}</td>
                  <td className="px-5 py-3 text-secondary">{course.duration as string}</td>
                  <td className="px-5 py-3 text-foreground font-medium">{course.instructor as string}</td>
                  <td className="px-5 py-3">
                    <span className={[
                      "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider",
                      course.is_active ? "bg-green-100 text-green-700 border border-green-200" : "bg-subtle text-muted border border-default",
                    ].join(" ")}>
                      {course.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/admin/courses/${course.id}/edit`}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-default bg-white px-3 py-1.5 text-xs font-semibold text-secondary transition-colors hover:border-primary hover:text-primary"
                      >
                        <Settings2 className="size-3.5" />
                        Settings
                      </Link>
                      <Link
                        href={`/admin/courses/${course.id}/curriculum`}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-default bg-white px-3 py-1.5 text-xs font-semibold text-secondary transition-colors hover:border-primary hover:text-primary"
                      >
                        <BookOpen className="size-3.5" />
                        Curriculum
                      </Link>
                      {/* <DeleteCourseButton courseId={course.id as string} courseName={course.title as string} /> */}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
