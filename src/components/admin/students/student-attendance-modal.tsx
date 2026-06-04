"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import type { StudentAttendanceRecord } from "./student-attendance-view";

const STATUSES = ["Present", "Late", "Early_Checkout", "Half_Day", "Absent", "Leave", "Holiday"] as const;
type Status = typeof STATUSES[number];

const STATUS_STYLE: Record<Status, string> = {
  Present:        "border-green-500 bg-green-500 text-white",
  Late:           "border-amber-500 bg-amber-500 text-white",
  Early_Checkout: "border-orange-500 bg-orange-500 text-white",
  Half_Day:       "border-blue-500 bg-blue-500 text-white",
  Absent:         "border-red-500 bg-red-500 text-white",
  Leave:          "border-amber-500 bg-amber-500 text-white",
  Holiday:        "border-purple-500 bg-purple-500 text-white",
};
const STATUS_INACTIVE: Record<Status, string> = {
  Present:        "border-green-200 text-green-700 hover:bg-green-50",
  Late:           "border-amber-200 text-amber-700 hover:bg-amber-50",
  Early_Checkout: "border-orange-200 text-orange-600 hover:bg-orange-50",
  Half_Day:       "border-blue-200 text-blue-700 hover:bg-blue-50",
  Absent:         "border-red-200 text-red-600 hover:bg-red-50",
  Leave:          "border-amber-200 text-amber-700 hover:bg-amber-50",
  Holiday:        "border-purple-200 text-purple-700 hover:bg-purple-50",
};

interface Props {
  studentId?: string;
  studentName?: string;
  date?: string;
  existingRecord?: StudentAttendanceRecord;
  canEdit: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function StudentAttendanceModal({
  studentId, studentName, date: initDate,
  existingRecord, canEdit, onClose, onSaved,
}: Props) {
  const [status, setStatus] = useState<Status | "">(
    (existingRecord?.status as Status) ?? ""
  );
  const [note, setNote]     = useState(existingRecord?.note ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  const isEdit   = !!existingRecord;
  const readonly = isEdit && !canEdit;

  async function handleSave() {
    setError("");
    if (!status) { setError("Please select a status"); return; }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/student-attendance/mark", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          date: initDate,
          status,
          note: note || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      toast.success(isEdit ? "Attendance updated" : "Attendance marked", {
        position: "top-right",
      });
      onSaved();
    } catch (e: any) {
      setError(e.message);
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!existingRecord?.id) return;
    if (!confirm("Are you sure you want to unmark this day's attendance?")) return;

    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/student-attendance/mark", {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: existingRecord.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to delete");
      toast.success("Attendance unmarked", { position: "top-right" });
      onSaved();
    } catch (e: any) {
      setError(e.message);
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-md shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-default">
          <h2 className="text-base font-bold text-foreground">
            {isEdit ? "Edit Attendance" : "Mark Attendance"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-muted hover:text-primary hover:bg-subtle transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700 font-medium">
              {error}
            </div>
          )}

          {/* Student (read-only display) */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-foreground">Student</label>
            <p className="rounded-md border border-default bg-subtle px-4 py-2.5 text-sm font-medium text-foreground">
              {studentName}
            </p>
          </div>

          {/* Date (read-only display) */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-foreground">Date</label>
            <p className="rounded-md border border-default bg-subtle px-4 py-2.5 text-sm font-medium text-foreground">
              {initDate}
            </p>
          </div>

          {/* Status — button selectors */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-foreground">Status *</label>
            <div className="grid grid-cols-2 gap-2">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={readonly}
                  onClick={() => !readonly && setStatus(s)}
                  className={[
                    "rounded-md border-2 px-4 py-2 text-xs font-bold transition-all",
                    status === s ? STATUS_STYLE[s] : `bg-white ${STATUS_INACTIVE[s]}`,
                    readonly ? "opacity-60 cursor-not-allowed" : "cursor-pointer",
                  ].join(" ")}
                >
                  {s.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>

          {/* Note */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-foreground">
              Note <span className="font-normal text-muted">(optional)</span>
            </label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={readonly}
              placeholder="e.g. Medical leave, sick day…"
              className="w-full rounded-md border border-default bg-white px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row gap-3 px-6 py-4 border-t border-default">
          {isEdit && canEdit && (
            <button
              onClick={handleDelete}
              disabled={saving}
              className="rounded-md border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50 transition-all text-center"
            >
              Unmark
            </button>
          )}
          <div className="flex-1 flex gap-3">
            {!readonly && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 rounded-md bg-primary py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 shadow-xs transition-all"
              >
                {saving ? "Saving…" : isEdit ? "Update" : "Save"}
              </button>
            )}
            <button
              onClick={onClose}
              className="flex-1 rounded-md border border-default py-2.5 text-sm font-semibold text-secondary hover:bg-subtle transition-colors"
            >
              {readonly ? "Close" : "Cancel"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
