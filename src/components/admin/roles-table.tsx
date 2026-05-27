"use client";

import { Pencil, ShieldOff, ShieldCheck, MoreHorizontal, Plus } from "lucide-react";
import { useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import type { AdminRoleRecord } from "@/types";
import { DataTable } from "./data-table";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { RoleForm } from "./role-form";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type RoleRow = AdminRoleRecord & { adminCount: number };

type RolesTableProps = {
  roles: RoleRow[];
};

export function RolesTable({ roles }: RolesTableProps) {
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);

  const [editingRole, setEditingRole] = useState<RoleRow | null>(null);
  const [editLoading, setEditLoading] = useState(false);

  async function handleEditRole(data: {
    name: string;
    label: string;
    description: string;
    permissions: Array<{ module: string; action: string }>;
  }) {
    if (!editingRole) return;
    setEditLoading(true);
    try {
      const res = await fetch(`/api/admin/roles/${editingRole.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Failed to update role.");
        return;
      }
      toast.success("Role updated successfully");
      setEditingRole(null);
      window.location.reload();
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setEditLoading(false);
    }
  }

  async function handleCreateRole(data: {
    name: string;
    label: string;
    description: string;
    permissions: Array<{ module: string; action: string }>;
  }) {
    setCreateLoading(true);
    try {
      const res = await fetch("/api/admin/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Failed to create role.");
        return;
      }
      toast.success("Role created successfully");
      setIsCreateOpen(false);
      window.location.reload();
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setCreateLoading(false);
    }
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/roles/${id}`, { method: "DELETE" });
      if (res.ok) window.location.reload();
      else {
        const data = await res.json();
        setError(data.error ?? "Failed to delete role.");
      }
    } finally {
      setDeleting(null);
      setConfirmId(null);
    }
  }

  const systemRoles = roles.filter((r) => r.isSystem);
  const customRoles = roles.filter((r) => !r.isSystem);
  const sorted = [...systemRoles, ...customRoles];

  const columns: ColumnDef<RoleRow>[] = [
    {
      accessorKey: "label",
      header: "Role Name",
      size: 160,
      cell: ({ row }) => {
        const role = row.original;
        return (
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground">{role.label}</span>
              {role.isSystem && (
                <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200 text-[10px]">
                  System
                </Badge>
              )}
            </div>
            <p className="text-xs text-secondary font-mono mt-0.5">{role.name}</p>
          </div>
        );
      },
    },
    {
      accessorKey: "description",
      header: "Description",
      enableSorting: false,
      cell: ({ getValue }) => (
        <p className="text-xs text-secondary whitespace-normal">{getValue() as string}</p>
      ),
    },
    {
      id: "permissions",
      header: "Permissions",
      size: 130,
      enableSorting: false,
      cell: ({ row }) => {
        const role = row.original;
        const isSuperAdmin = role.name === "super_admin";
        const permCount = role.permissions.length;
        const modules = [...new Set(role.permissions.map((p) => p.module))];
        const permSummary = isSuperAdmin
          ? "Full access"
          : permCount === 0
            ? "No permissions"
            : `${permCount} permission${permCount !== 1 ? "s" : ""}`;
        return (
          <span
            title={modules.length ? `Modules: ${modules.join(", ")}` : "No permissions assigned"}
            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${isSuperAdmin
                ? "bg-primary/10 text-primary"
                : permCount === 0
                  ? "bg-gray-50 text-gray-600"
                  : "bg-subtle text-foreground"
              }`}
          >
            {permSummary}
          </span>
        );
      },
    },
    {
      accessorKey: "adminCount",
      header: "Admins",
      size: 80,
      cell: ({ getValue }) => {
        const n = getValue() as number;
        return (
          <span
            className={`inline-flex size-7 items-center justify-center rounded-full text-xs font-bold ${n > 0 ? "bg-primary/10 text-primary" : "bg-subtle text-secondary"
              }`}
          >
            {n}
          </span>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      size: 64,
      enableSorting: false,
      cell: ({ row }) => {
        const role = row.original;
        const canEdit = role.name !== "super_admin";
        const canDelete = !role.isSystem && role.adminCount === 0;
        const editTooltip = !canEdit ? "The super_admin role cannot be edited" : undefined;
        const deleteTooltip = role.isSystem
          ? "System roles cannot be deleted"
          : role.adminCount > 0
            ? `${role.adminCount} admin(s) use this role — reassign first`
            : undefined;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-7 w-7 items-center justify-center rounded-md border border-default bg-white text-secondary transition-colors hover:border-primary hover:text-primary">
                <MoreHorizontal className="size-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="z-50 min-w-[160px] overflow-hidden rounded-md border border-default bg-white shadow-lg">
              <DropdownMenuItem
                onClick={() => canEdit && setEditingRole(role)}
                disabled={!canEdit}
                title={editTooltip}
                className="flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-subtle transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Pencil className="size-3.5" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => canDelete && setConfirmId(role.id)}
                disabled={!canDelete}
                title={deleteTooltip}
                className="flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ShieldOff className="size-3.5" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <div className="w-full min-h-screen bg-subtle px-6 py-10 lg:px-10">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <div className="mb-1 flex items-center gap-3">
            <ShieldCheck className="size-6 text-primary" />
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-foreground">
              Roles &amp; Permissions
            </h1>
          </div>
          <p className="text-sm text-secondary">
            Manage roles and their permission sets.
          </p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex shrink-0 items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:opacity-90 hover:shadow-md cursor-pointer"
        >
          <Plus className="size-4" />
          Create New Role
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Confirm dialog */}
      {confirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-default bg-white p-6 shadow-xl">
            <ShieldOff className="mb-3 size-10 text-red-600" />
            <h2 className="text-base font-bold text-foreground">Delete this role?</h2>
            <p className="mt-1 text-sm text-secondary">
              This action cannot be undone. Any admins currently using this role must be reassigned first.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => handleDelete(confirmId)}
                disabled={!!deleting}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
              <button
                onClick={() => setConfirmId(null)}
                className="flex-1 rounded-lg border border-default px-4 py-2 text-sm font-semibold text-foreground hover:bg-subtle"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create role modal */}
      {isCreateOpen && (
        <Dialog
          open={isCreateOpen}
          title="Create New Role"
          onClose={() => setIsCreateOpen(false)}
          size="3xl"
          scrollable={false}
        >
          <RoleForm
            onSubmit={handleCreateRole}
            onCancel={() => setIsCreateOpen(false)}
            loading={createLoading}
          />
        </Dialog>
      )}

      {/* Edit role modal */}
      {editingRole && (
        <Dialog
          open={!!editingRole}
          title="Edit Role"
          onClose={() => setEditingRole(null)}
          size="3xl"
          scrollable={false}
        >
          <RoleForm
            initialData={editingRole}
            onSubmit={handleEditRole}
            onCancel={() => setEditingRole(null)}
            loading={editLoading}
          />
        </Dialog>
      )}

      <DataTable
        columns={columns}
        data={sorted}
        emptyMessage="No roles found."
        emptyIcon={ShieldCheck}
      />
    </div>
  );
}
