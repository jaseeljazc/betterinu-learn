"use client";

import { useState, useEffect } from "react";
import { Save, TableProperties } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import type { AttendanceRecord } from "./attendance-view";

type EmployeeRow = { id: string; fullName: string; employeeCode: string; deptName?: string };

const STATUSES = ["Present", "Absent", "Leave", "Holiday"] as const;
type Status = typeof STATUSES[number];

interface Props {
  date: string;
  departmentId: string;
  records: AttendanceRecord[];
  loading: boolean;
  canMark: boolean;
  onSaved: () => void;
}

export function AttendanceDailySheet({ date, departmentId, records, loading, canMark, onSaved }: Props) {
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [sheet, setSheet] = useState<Record<string, { status: Status | ""; note: string }>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams();
    if (departmentId) params.set("departmentId", departmentId);
    fetch(`/api/admin/employees?${params}`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setEmployees(d.employees ?? []));
  }, [departmentId]);

  // Pre-fill sheet with existing records
  useEffect(() => {
    const initial: Record<string, { status: Status | ""; note: string }> = {};
    employees.forEach((emp) => {
      const rec = records.find((r) => r.employeeId === emp.id);
      initial[emp.id] = {
        status: (rec?.status as Status) ?? "",
        note:   rec?.note ?? "",
      };
    });
    setSheet(initial);
  }, [employees, records]);

  function update(empId: string, field: "status" | "note", value: string) {
    setSheet((prev) => ({ ...prev, [empId]: { ...prev[empId], [field]: value } }));
  }

  async function handleSaveAll() {
    if (!canMark) return;
    setSaving(true);
    try {
      const rows = employees.filter((e) => sheet[e.id]?.status);
      await Promise.all(
        rows.map((emp) =>
          fetch("/api/admin/employees/attendance", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              employeeId: emp.id,
              date,
              status: sheet[emp.id].status,
              note: sheet[emp.id].note || null,
            }),
          })
        )
      );
      toast.success("Attendance saved successfully", { position: "top-right" });
      onSaved();
    } catch {
      toast.error("Failed to save attendance");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="rounded-2xl border border-default bg-white p-6 animate-pulse h-48" />;
  }

  return (
    <div className="rounded-2xl border border-default bg-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-default bg-subtle/50">
        <div className="flex items-center gap-2">
          <TableProperties className="size-4 text-muted" />
          <span className="text-sm font-semibold text-foreground">Daily Sheet — {date}</span>
        </div>
        {canMark && (
          <button
            onClick={handleSaveAll}
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 shadow-sm"
          >
            <Save className="size-4" /> {saving ? "Saving…" : "Save All"}
          </button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-default bg-subtle/30">
              <th className="text-left px-5 py-2.5 text-xs font-semibold text-muted uppercase tracking-wider w-1/3">Employee</th>
              <th className="text-left px-5 py-2.5 text-xs font-semibold text-muted uppercase tracking-wider w-40">Status</th>
              <th className="text-left px-5 py-2.5 text-xs font-semibold text-muted uppercase tracking-wider">Note</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-default">
            {employees.map((emp) => {
              const row = sheet[emp.id] ?? { status: "", note: "" };
              const statusColor: Record<string, string> = {
                Present: "bg-green-50 border-green-200 text-green-700",
                Absent:  "bg-red-50 border-red-200 text-red-700",
                Leave:   "bg-amber-50 border-amber-200 text-amber-700",
                Holiday: "bg-purple-50 border-purple-200 text-purple-700",
              };
              return (
                <tr key={emp.id} className="hover:bg-subtle/30 transition-colors">
                  <td className="px-5 py-3">
                    <p className="font-semibold text-foreground">{emp.fullName}</p>
                    <p className="text-[11px] text-muted">{emp.employeeCode}{emp.deptName ? ` · ${emp.deptName}` : ""}</p>
                  </td>
                  <td className="px-5 py-3">
                    {canMark ? (
                      <Select
                        value={row.status || "none"}
                        onValueChange={(v) => update(emp.id, "status", v === "none" ? "" : v)}
                      >
                        <SelectTrigger className={`h-8 w-36 text-xs font-semibold rounded-lg border ${row.status ? statusColor[row.status] : ""}`}>
                          <SelectValue placeholder="— Select —" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">— Not marked —</SelectItem>
                          {STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold border ${row.status ? statusColor[row.status] : "text-muted"}`}>
                        {row.status || "—"}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    {canMark ? (
                      <input
                        value={row.note}
                        onChange={(e) => update(emp.id, "note", e.target.value)}
                        placeholder="Optional note…"
                        className="w-full rounded-lg border border-default bg-white px-3 py-1.5 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                      />
                    ) : (
                      <span className="text-xs text-muted">{row.note || "—"}</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {!employees.length && (
              <tr>
                <td colSpan={3} className="px-5 py-10 text-center text-muted text-sm">No employees found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
