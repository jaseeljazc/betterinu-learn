import Link from "next/link";
import { Pencil, Plus, BookOpen, Settings2 } from "lucide-react";
import { sql } from "@/lib/db";

async function getCourses() {
  return sql`SELECT * FROM courses ORDER BY id`;
}

export default async function AdminCoursesPage() {
  const courses = await getCourses();

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Courses</h1>
          <p className="mt-1 text-sm text-[#7a7a62]">Manage course metadata, descriptions, instructors, and visibility.</p>
        </div>
        <Link
          href="/admin/courses/new"
          className="flex items-center gap-2 rounded-lg bg-[#1a4031] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
        >
          <Plus className="size-4" /> Add Course
        </Link>
      </div>

      {courses.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#e5e2da] bg-[#fafaf8] py-20 text-center">
          <BookOpen className="size-10 text-[#7a7a62] mb-4" />
          <h3 className="text-lg font-bold text-[#1a4031]">No courses yet</h3>
          <p className="mt-1 max-w-sm text-sm text-[#7a7a62]">Get started by creating your first course. You can add curriculum and modules later.</p>
          <Link
            href="/admin/courses/new"
            className="mt-6 flex items-center gap-2 rounded-lg bg-[#1a4031] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
          >
            <Plus className="size-4" /> Create First Course
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[#e5e2da] bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-[#e5e2da] bg-[#f9f9f6]">
              <tr>
                {["Course", "Level", "Duration", "Instructor", "Status", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#7a7a62]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0ede6]">
              {courses.map((course) => (
                <tr key={course.id as string} className="hover:bg-[#fafaf8]">
                  <td className="px-4 py-3">
                    <p className="font-semibold">{course.title as string}</p>
                    <p className="text-xs text-[#7a7a62]">{course.id as string}</p>
                  </td>
                  <td className="px-4 py-3 text-[#7a7a62]">{course.level as string}</td>
                  <td className="px-4 py-3 text-[#7a7a62]">{course.duration as string}</td>
                  <td className="px-4 py-3">{course.instructor as string}</td>
                  <td className="px-4 py-3">
                    <span className={[
                      "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold",
                      course.is_active ? "bg-green-100 text-primary" : "bg-gray-100 text-gray-600",
                    ].join(" ")}>
                      {course.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/admin/courses/${course.id}/edit`}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#e5e2da] bg-white px-3 py-1.5 text-xs font-semibold text-[#4a4a3a] transition-colors hover:border-primary hover:text-primary"
                      >
                        <Settings2 className="size-3" />
                        Settings
                      </Link>
                      <Link
                        href={`/admin/courses/${course.id}/curriculum`}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#e5e2da] bg-white px-3 py-1.5 text-xs font-semibold text-[#4a4a3a] transition-colors hover:border-primary hover:text-primary"
                      >
                        <BookOpen className="size-3" />
                        Curriculum
                      </Link>
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
