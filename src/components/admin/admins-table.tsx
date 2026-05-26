"use client";

import Link from "next/link";
import { Pencil, UserX, MoreHorizontal } from "lucide-react";
import { useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import type { AdminRole } from "@/types";
import { DataTable } from "./data-table";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/* ------------------------------------------------------------------ */
/*  Types & constants                                                    */
/* ------------------------------------------------------------------ */

type AdminRow = {
  id: string;
  fullName: string;
  email: string;
  status: "active" | "inactive" | "pending";
  roleName: AdminRole;
  roleLabel: string;
  createdByName: string | null;
  createdAt: string;
  lastLogin: string | null;
  tempPassword: string | null;
};

type AdminsTableProps = {
  admins: AdminRow[];
  currentAdminId: string;
};

const ROLE_BADGE: Record<AdminRole, string> = {
  super_admin: "bg-primary/10 text-primary border-primary/20",
  admin: "bg-blue-50 text-blue-700 border-blue-200",
  instructor: "bg-purple-50 text-purple-700 border-purple-200",
  support: "bg-gray-50 text-gray-600 border-gray-200",
  account_manager: "bg-amber-50 text-amber-700 border-amber-200",
};

const STATUS_BADGE: Record<string, string> = {
  active: "bg-green-50 text-green-700 border-green-200",
  pending: "bg-yellow-50 text-yellow-700 border-yellow-200",
  inactive: "bg-gray-50 text-gray-600 border-gray-200",
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export function AdminsTable({ admins, currentAdminId }: AdminsTableProps) {
  const [deactivating, setDeactivating] = useState<string | null>(null);

  async function handleDeactivate(id: string) {
    if (!confirm("Deactivate this admin? They will lose access immediately.")) return;
    setDeactivating(id);
    try {
      const res = await fetch(`/api/admin/admins/${id}`, { method: "DELETE" });
      if (res.ok) window.location.reload();
      else {
        const data = await res.json();
        alert(data.error ?? "Failed to deactivate.");
      }
    } finally {
      setDeactivating(null);
    }
  }

  const columns: ColumnDef<AdminRow>[] = [
    {
      accessorKey: "fullName",
      header: "Name",
      size: 200,
      cell: ({ row }) => {
        const isMe = row.original.id === currentAdminId;
        return (
          <span className="font-semibold text-foreground">
            {row.getValue("fullName")}
            {isMe && (
              <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                You
              </span>
            )}
          </span>
        );
      },
    },
    {
      accessorKey: "email",
      header: "Email",
      size: 220,
      cell: ({ getValue }) => (
        <span className="text-secondary text-xs">{getValue() as string}</span>
      ),
    },
    {
      accessorKey: "tempPassword",
      header: "Temp Password",
      size: 130,
      cell: ({ getValue }) => {
        const val = getValue() as string | null;
        return val ? (
          <code className="rounded px-1.5 py-0.5 font-mono text-xs font-semibold text-muted dark:text-white">
            {val}
          </code>
        ) : (
          <span className="text-secondary text-xs">—</span>
        );
      },
    },
    {
      accessorKey: "roleName",
      header: "Role",
      size: 140,
      filterFn: "equals",
      cell: ({ row }) => (
        <Badge variant="outline" className={ROLE_BADGE[row.original.roleName]}>
          {row.original.roleLabel}
        </Badge>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      size: 110,
      filterFn: "equals",
      cell: ({ getValue }) => {
        const v = getValue() as string;
        return (
          <Badge variant="outline" className={STATUS_BADGE[v]}>
            {v.charAt(0).toUpperCase() + v.slice(1)}
          </Badge>
        );
      },
    },
    {
      accessorKey: "createdByName",
      header: "Created By",
      size: 140,
      enableSorting: false,
      cell: ({ getValue }) => (
        <span className="text-secondary">{(getValue() as string | null) ?? "System"}</span>
      ),
    },
    {
      accessorKey: "createdAt",
      header: "Created At",
      size: 120,
      cell: ({ getValue }) => (
        <span className="text-secondary">{fmtDate(getValue() as string)}</span>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      size: 64,
      enableSorting: false,
      cell: ({ row }) => {
        const admin = row.original;
        const isMe = admin.id === currentAdminId;
        const isSuperAdmin = admin.roleName === "super_admin";
        const disabled = isMe || isSuperAdmin;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                disabled={disabled}
                className="flex h-7 w-7 items-center justify-center rounded-md border border-default bg-white text-secondary transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
              >
                <MoreHorizontal className="size-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="z-50 min-w-[160px] overflow-hidden rounded-xl border border-default bg-white shadow-lg">
              <DropdownMenuItem asChild>
                <Link
                  href={`/admin/admins/${admin.id}`}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-subtle transition-colors cursor-pointer"
                >
                  <Pencil className="size-3.5" /> Edit
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleDeactivate(admin.id)}
                disabled={!!deactivating}
                className="flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-50"
              >
                <UserX className="size-3.5" />
                {deactivating === admin.id ? "Deactivating…" : "Deactivate"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={admins}
      searchable
      searchPlaceholder="Search name or email…"
      searchColumn="fullName"
      filters={[
        {
          column: "roleName",
          label: "Role",
          options: [
            { value: "super_admin", label: "Super Admin" },
            { value: "admin", label: "Admin" },
            { value: "instructor", label: "Instructor" },
            { value: "support", label: "Support" },
            { value: "account_manager", label: "Account Manager" },
          ],
        },
        {
          column: "status",
          label: "Status",
          options: [
            { value: "active", label: "Active" },
            { value: "pending", label: "Pending" },
            { value: "inactive", label: "Inactive" },
          ],
        },
      ]}
      emptyMessage="No admins match your filters."
      emptyIcon={UserX}
    />
  );
}
