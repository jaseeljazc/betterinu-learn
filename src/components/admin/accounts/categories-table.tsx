"use client";

import { useState, useEffect } from "react";
import type { AccountCategory } from "@/types";
import { Archive, ArchiveRestore, Pencil, Plus, Tag, X, MoreHorizontal, Trash2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/admin/data-table";
import type { ColumnDef } from "@tanstack/react-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/* ------------------------------------------------------------------ */
/*  CategoryFormDialog (unchanged from before)                         */
/* ------------------------------------------------------------------ */

const PRESET_COLORS = [
  "#22c55e", "#10b981", "#3b82f6", "#6366f1", "#8b5cf6",
  "#ec4899", "#f59e0b", "#ef4444", "#f97316", "#64748b",
];

const INCOME_ICONS = ["GraduationCap", "Heart", "Award", "RotateCcw", "TrendingUp", "DollarSign", "Star"];
const EXPENSE_ICONS = ["Users", "Building", "Zap", "Package", "Megaphone", "Wrench", "MoreHorizontal", "ShoppingCart", "Car", "Briefcase"];

interface CategoryFormDialogProps {
  category?: AccountCategory;
  defaultType?: "income" | "expense";
  onClose: () => void;
  onSaved: (cat: AccountCategory) => void;
}

function CategoryFormDialog({ category, defaultType = "income", onClose, onSaved }: CategoryFormDialogProps) {
  const isEdit = !!category;
  const [name, setName] = useState(category?.name ?? "");
  const [type, setType] = useState<"income" | "expense">(category?.type ?? defaultType);
  const [color, setColor] = useState(category?.color ?? PRESET_COLORS[0]);
  const [icon, setIcon] = useState(category?.icon ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const iconOptions = type === "income" ? INCOME_ICONS : EXPENSE_ICONS;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Name is required"); return; }
    setSaving(true);
    setError("");

    const body = { name: name.trim(), type, color, icon: icon || undefined };
    const url = isEdit ? `/api/admin/accounts/categories/${category.id}` : "/api/admin/accounts/categories";
    const method = isEdit ? "PATCH" : "POST";

    try {
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");

      onSaved({
        id: isEdit ? category.id : data.categoryId,
        name: name.trim(), type, color, icon,
        isSystem: category?.isSystem ?? false,
        isArchived: category?.isArchived ?? false,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-default bg-white shadow-xl flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-default shrink-0 flex items-center justify-between">
          <h3 className="text-lg font-bold text-foreground">{isEdit ? "Edit Category" : "New Category"}</h3>
          <button onClick={onClose} type="button" className="p-1.5 text-secondary hover:bg-subtle rounded-lg transition-colors">
            <X className="size-5" />
          </button>
        </div>
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">{error}</div>}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-foreground">Name *</label>
                <input value={name} onChange={(e) => setName(e.target.value)} disabled={isEdit && category?.isSystem}
                  placeholder="Category name"
                  className="w-full rounded-xl border border-default bg-white px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:bg-subtle disabled:text-secondary" required />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-foreground">Type</label>
                <div className="flex gap-2">
                  {(["income", "expense"] as const).map((t) => (
                    <button key={t} type="button" disabled={isEdit && category?.isSystem} onClick={() => setType(t)}
                      className={`flex-1 rounded-xl py-2 text-sm font-semibold transition-all disabled:opacity-60 ${type === t ? (t === "income" ? "bg-green-600 text-white" : "bg-red-600 text-white") : "bg-subtle text-secondary hover:bg-default"}`}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-foreground">Color</label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_COLORS.map((c) => (
                    <button key={c} type="button" onClick={() => setColor(c)}
                      className={`size-7 rounded-full transition-transform hover:scale-110 ${color === c ? "ring-2 ring-offset-2 ring-primary scale-110" : ""}`}
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-foreground">Icon</label>
                <div className="flex flex-wrap gap-2">
                  {iconOptions.map((ic) => (
                    <button key={ic} type="button" onClick={() => setIcon(ic)}
                      className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${icon === ic ? "border-primary bg-primary/10 text-primary" : "border-default text-secondary hover:border-primary/50"}`}>
                      {ic}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving}
                  className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50">
                  {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Category"}
                </button>
                <button type="button" onClick={onClose}
                  className="rounded-xl border border-default px-4 py-2.5 text-sm font-semibold text-secondary hover:bg-subtle">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  CategoriesTable                                                     */
/* ------------------------------------------------------------------ */

interface CategoriesTableProps {
  canEdit: boolean;
}

export function CategoriesTable({ canEdit }: CategoriesTableProps) {
  const [categories, setCategories] = useState<AccountCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState<{ open: boolean; category?: AccountCategory; defaultType?: "income" | "expense" }>({ open: false });
  const [archiving, setArchiving] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/accounts/categories", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setCategories(d.categories ?? []))
      .finally(() => setLoading(false));
  }, []);

  async function handleArchive(cat: AccountCategory) {
    setArchiving(cat.id);
    const action = cat.isArchived ? "unarchive" : "archive";
    try {
      await fetch(`/api/admin/accounts/categories/${cat.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ [action]: true }),
      });
      setCategories((prev) => prev.map((c) => (c.id === cat.id ? { ...c, isArchived: !cat.isArchived } : c)));
    } finally {
      setArchiving(null);
    }
  }

  async function handleDelete(cat: AccountCategory) {
    if (!confirm(`Are you sure you want to completely delete "${cat.name}"? This action cannot be undone.`)) return;
    setDeleting(cat.id);
    try {
      const res = await fetch(`/api/admin/accounts/categories/${cat.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        setCategories((prev) => prev.filter((c) => c.id !== cat.id));
      } else {
        const data = await res.json();
        alert(data.error ?? "Failed to delete.");
      }
    } catch (err: unknown) {
      alert("Failed to delete.");
    } finally {
      setDeleting(null);
    }
  }

  function handleSaved(cat: AccountCategory) {
    setCategories((prev) => {
      const idx = prev.findIndex((c) => c.id === cat.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = cat; return next; }
      return [...prev, cat];
    });
    setDialog({ open: false });
  }

  const columns: ColumnDef<AccountCategory>[] = [
    {
      id: "color",
      header: "Color",
      size: 60,
      enableSorting: false,
      cell: ({ row }) => (
        <div className="size-5 rounded-full" style={{ backgroundColor: row.original.color ?? "#64748b" }} />
      ),
    },
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ getValue }) => (
        <span className="font-semibold text-foreground">{getValue() as string}</span>
      ),
    },
    {
      accessorKey: "type",
      header: "Type",
      size: 110,
      filterFn: "equals",
      cell: ({ getValue }) => {
        const t = getValue() as string;
        return (
          <Badge variant="outline" className={t === "income" ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </Badge>
        );
      },
    },
    {
      accessorKey: "icon",
      header: "Icon",
      size: 120,
      enableSorting: false,
      cell: ({ getValue }) => (
        <span className="font-mono text-xs text-secondary">{(getValue() as string) || "—"}</span>
      ),
    },
    {
      id: "flags",
      header: "Flags",
      size: 140,
      enableSorting: false,
      cell: ({ row }) => {
        const cat = row.original;
        return (
          <div className="flex gap-1 flex-wrap">
            {cat.isSystem && <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px]">System</Badge>}
            {cat.isArchived && <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200 text-[10px]">Archived</Badge>}
          </div>
        );
      },
    },
    ...(canEdit
      ? [
          {
            id: "actions",
            header: "Actions",
            size: 64,
            enableSorting: false,
            cell: ({ row }: { row: { original: AccountCategory } }) => {
              const cat = row.original;
              return (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex h-7 w-7 items-center justify-center rounded-md border border-default bg-white text-secondary transition-colors hover:border-primary hover:text-primary">
                      <MoreHorizontal className="size-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="z-50 min-w-[160px] overflow-hidden rounded-xl border border-default bg-white shadow-lg">
                    <DropdownMenuItem
                      onClick={() => setDialog({ open: true, category: cat })}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-subtle transition-colors cursor-pointer"
                    >
                      <Pencil className="size-3.5" /> Edit
                    </DropdownMenuItem>
                    {!cat.isSystem && (
                      <>
                        <DropdownMenuSeparator className="my-0.5 border-t border-default/50" />
                        <DropdownMenuItem
                          onClick={() => handleArchive(cat)}
                          disabled={archiving === cat.id}
                          className="flex items-center gap-2 px-4 py-2.5 text-sm text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {cat.isArchived ? <ArchiveRestore className="size-3.5" /> : <Archive className="size-3.5" />}
                          {archiving === cat.id ? "Working…" : cat.isArchived ? "Unarchive" : "Archive"}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(cat)}
                          disabled={deleting === cat.id}
                          className="flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <Trash2 className="size-3.5" />
                          {deleting === cat.id ? "Deleting…" : "Delete"}
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              );
            },
          } as ColumnDef<AccountCategory>,
        ]
      : []),
  ];

  return (
    <>
      <DataTable
        columns={columns}
        data={categories}
        loading={loading}
        searchable
        searchPlaceholder="Search categories…"
        searchColumn="name"
        filters={[
          {
            column: "type",
            label: "Type",
            options: [
              { value: "income", label: "Income" },
              { value: "expense", label: "Expense" },
            ],
          },
        ]}
        emptyMessage="No categories found."
        emptyIcon={Tag}
        actions={
          canEdit ? (
            <button
              onClick={() => setDialog({ open: true })}
              className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90 shadow-sm"
            >
              <Plus className="size-4" /> Add Category
            </button>
          ) : undefined
        }
      />

      {dialog.open && (
        <CategoryFormDialog
          category={dialog.category}
          defaultType={dialog.defaultType}
          onClose={() => setDialog({ open: false })}
          onSaved={handleSaved}
        />
      )}
    </>
  );
}
