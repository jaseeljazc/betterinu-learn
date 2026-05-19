import Link from "next/link";
import { Pencil, Plus, BookOpen, Settings2 } from "lucide-react";
import { sql } from "@/lib/db";
import { DeleteCourseButton } from "@/components/admin/delete-course-button";
import { cookies } from "next/headers";
import { hasPermission } from "@/lib/permissions";
import { CoursesTable } from "@/components/admin/courses-table";

async function getCourses() {
  return sql`SELECT * FROM courses ORDER BY id`;
}

export default async function AdminCoursesPage() {
  const courses = await getCourses();

  const cookieStore = await cookies();
  const rbacStr = cookieStore.get("__rbac")?.value;
  let canCreateCourse = false;
  let canEditCourse = false;
  let canEditCurriculum = false;
  
  if (rbacStr) {
    try {
      const payload = JSON.parse(decodeURIComponent(rbacStr));
      canCreateCourse = hasPermission(payload.role, payload.permissions || [], "courses", "create");
      canEditCourse = hasPermission(payload.role, payload.permissions || [], "courses", "edit");
      canEditCurriculum = hasPermission(payload.role, payload.permissions || [], "curriculum", "edit");
    } catch {}
  }

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
        {canCreateCourse && (
          <Link
            href="/admin/courses/new"
            className="flex shrink-0 items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-all shadow-sm hover:shadow-md"
          >
            <Plus className="size-4" /> Add Course
          </Link>
        )}
      </div>

      {courses.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-default bg-white py-20 text-center shadow-sm">
          <BookOpen className="size-10 text-muted mb-4" />
          <h3 className="text-lg font-bold text-foreground">No courses yet</h3>
          <p className="mt-1 max-w-sm text-sm text-secondary">Get started by creating your first course. You can add curriculum and modules later.</p>
          {canCreateCourse && (
            <Link
              href="/admin/courses/new"
              className="mt-6 flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-all shadow-sm"
            >
              <Plus className="size-4" /> Create First Course
            </Link>
          )}
        </div>
      ) : (
        <CoursesTable
          courses={courses as any}
          canEditCourse={canEditCourse}
          canEditCurriculum={canEditCurriculum}
          canCreateCourse={canCreateCourse}
        />
      )}
    </div>
  );
}
