"use client";

import Link from "next/link";
import { Settings2, BookOpen, Plus } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/admin/data-table";
import { Badge } from "@/components/ui/badge";

type CourseRow = {
  id: string | number;
  title: string;
  level: string;
  duration: string;
  instructor: string;
  is_active: boolean;
};

interface CoursesTableProps {
  courses: CourseRow[];
  canEditCourse: boolean;
  canEditCurriculum: boolean;
  canCreateCourse: boolean;
}

export function CoursesTable({ courses, canEditCourse, canEditCurriculum, canCreateCourse }: CoursesTableProps) {
  const columns: ColumnDef<CourseRow>[] = [
    {
      accessorKey: "title",
      header: "Course",
      size: 250,
      cell: ({ row }) => (
        <div>
          <p className="font-semibold text-foreground">{row.original.title}</p>
          <p className="text-[11px] font-mono text-muted uppercase tracking-wider">{row.original.id}</p>
        </div>
      ),
    },
    {
      accessorKey: "level",
      header: "Level",
      size: 130,
      filterFn: "equals",
      cell: ({ getValue }) => <span className="text-secondary">{getValue() as string}</span>,
    },
    {
      accessorKey: "duration",
      header: "Duration",
      size: 120,
      enableSorting: false,
      cell: ({ getValue }) => <span className="text-secondary">{getValue() as string}</span>,
    },
    {
      accessorKey: "instructor",
      header: "Instructor",
      size: 180,
      cell: ({ getValue }) => <span className="font-medium text-foreground">{getValue() as string}</span>,
    },
    {
      accessorKey: "is_active",
      header: "Status",
      size: 110,
      filterFn: "equals",
      cell: ({ getValue }) => {
        const active = getValue() as boolean;
        return (
          <Badge
            variant="outline"
            className={active ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-50 text-gray-600 border-gray-200"}
          >
            {active ? "Active" : "Inactive"}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      enableSorting: false,
      cell: ({ row }) => {
        const course = row.original;
        if (!canEditCourse && !canEditCurriculum) return null;
        return (
          <div className="flex items-center justify-end gap-2">
            {canEditCourse && (
              <Link
                href={`/admin/courses/${course.id}/edit`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-default bg-white px-3 py-1.5 text-xs font-semibold text-secondary transition-colors hover:border-primary hover:text-primary"
              >
                <Settings2 className="size-3.5" /> Settings
              </Link>
            )}
            {canEditCurriculum && (
              <Link
                href={`/admin/courses/${course.id}/curriculum`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-default bg-white px-3 py-1.5 text-xs font-semibold text-secondary transition-colors hover:border-primary hover:text-primary"
              >
                <BookOpen className="size-3.5" /> Curriculum
              </Link>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={courses}
      searchable
      searchPlaceholder="Search course title..."
      searchColumn="title"
      filters={[
        {
          column: "is_active",
          label: "Status",
          options: [
            { value: "true", label: "Active" },
            { value: "false", label: "Inactive" },
          ],
        },
      ]}
      emptyMessage="No courses yet."
      emptyIcon={BookOpen}
    />
  );
}
