"use client";

import Link from "next/link";
import { Eye, Users } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/admin/data-table";
import { Badge } from "@/components/ui/badge";

type StudentRow = {
  id: string;
  name: string;
  email: string;
  status: "active" | "inactive" | "pending";
  created_at: string;
  course_count: number;
};

interface StudentsTableProps {
  students: StudentRow[];
  canCreate: boolean;
}

const STATUS_BADGE: Record<string, string> = {
  active:   "bg-green-50 text-green-700 border-green-200",
  pending:  "bg-yellow-50 text-yellow-700 border-yellow-200",
  inactive: "bg-red-50 text-red-700 border-red-200",
};

export function StudentsTable({ students, canCreate }: StudentsTableProps) {
  const columns: ColumnDef<StudentRow>[] = [
    {
      accessorKey: "name",
      header: "Name",
      size: 200,
      cell: ({ getValue }) => <span className="font-semibold text-foreground">{getValue() as string}</span>,
    },
    {
      accessorKey: "email",
      header: "Email",
      size: 250,
      cell: ({ getValue }) => <span className="text-secondary">{getValue() as string}</span>,
    },
    {
      accessorKey: "course_count",
      header: "Courses",
      size: 100,
      cell: ({ getValue }) => (
        <span className="inline-flex size-6 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
          {getValue() as number}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      size: 120,
      filterFn: "equals",
      cell: ({ getValue }) => {
        const val = (getValue() as string) || "active";
        return (
          <Badge variant="outline" className={STATUS_BADGE[val]}>
            {val.charAt(0).toUpperCase() + val.slice(1)}
          </Badge>
        );
      },
    },
    {
      accessorKey: "created_at",
      header: "Joined",
      size: 140,
      cell: ({ getValue }) => (
        <span className="text-secondary">
          {new Date(getValue() as string).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </span>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      size: 100,
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-2">
          <Link
            href={`/admin/students/${row.original.id}`}
            className="inline-flex items-center gap-1.5 rounded-md border border-default bg-white px-3 py-1.5 text-xs font-semibold text-secondary transition-colors hover:border-primary hover:text-primary"
          >
            <Eye className="size-3.5" /> View
          </Link>
        </div>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={students}
      searchable
      searchPlaceholder="Search name or email..."
      searchColumn="name"
      filters={[
        {
          column: "status",
          label: "Status",
          options: [
            { value: "active", label: "Active" },
            { value: "inactive", label: "Inactive" },
          ],
        },
      ]}
      emptyMessage="No students yet."
      emptyIcon={Users}
    />
  );
}
