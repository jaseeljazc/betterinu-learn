"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { clientAuth } from "@/lib/firebase-client";
import type { AttendanceRecord } from "./attendance-view";

const STATUSES = ["Present", "Absent", "Leave", "Half_Day", "Holiday"] as const;
type Status = typeof STATUSES[number];

const STATUS_STYLE: Record<Status, string> = {
  Present: "border-green-500 bg-green-500 text-white",
  Absent:  "border-red-500 bg-red-500 text-white",
  Leave:   "border-amber-500 bg-amber-500 text-white",
  Half_Day: "border-blue-500 bg-blue-500 text-white",
  Holiday: "border-purple-500 bg-purple-500 text-white",
};
const STATUS_INACTIVE: Record<Status, string> = {
  Present: "border-green-200 text-green-700 hover:bg-green-50",
  Absent:  "border-red-200 text-red-600 hover:bg-red-50",
  Leave:   "border-amber-200 text-amber-700 hover:bg-amber-50",
  Half_Day: "border-blue-200 text-blue-700 hover:bg-blue-50",
  Holiday: "border-purple-200 text-purple-700 hover:bg-purple-50",
};

type Employee = { id: string; fullName: string; employeeCode: string };

interface Props {
  employeeId?: string;
  employeeName?: string;
  date?: string;
  existingRecord?: AttendanceRecord;
  canEdit: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const ALL = "__all__";

export function AttendanceModal({
  employeeId: initEmpId, employeeName: initEmpName,
  date: initDate, existingRecord, canEdit, onClose, onSaved,
}: Props) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [empId, setEmpId] = useState(initEmpId ?? "");
  const [date, setDate] = useState(initDate ?? new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState<Status | "">(
    (existingRecord?.status as Status) ?? ""
  );
  const [note, setNote] = useState(existingRecord?.note ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isEdit = !!existingRecord;
  const readonly = isEdit && !canEdit;

  useEffect(() => {
    fetch("/api/admin/employees", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setEmployees(d.employees ?? []));
  }, []);

  async function doPost() {
    return fetch("/api/admin/employees/attendance", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employeeId: empId, date, status, note: note || null }),
    });
  }

  async function handleSave() {
    setError("");
    if (!empId)  { setError("Please select an employee"); return; }
    if (!date)   { setError("Date is required"); return; }
    if (!status) { setError("Please select a status"); return; }

    setSaving(true);
    try {
      let res = await doPost();

      // Token may have expired — get a fresh Firebase ID token, refresh the cookie, then retry once
      if (res.status === 401) {
        const user = clientAuth.currentUser;
        if (user) {
          const freshToken = await user.getIdToken(true); // force refresh
          await fetch("/api/auth/refresh-session", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idToken: freshToken }),
          });
          res = await doPost();
        }
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      toast.success(isEdit ? "Attendance updated" : "Attendance marked", { position: "top-right" });
      onSaved();
    } catch (e: any) {
      setError(e.message);
      setSaving(false);
    }
  }



  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-default">
          <h2 className="text-base font-bold text-foreground">
            {isEdit ? "Edit Attendance" : "Mark Attendance"}
          </h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted hover:text-primary hover:bg-subtle transition-colors">
            <X className="size-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700 font-medium">
              {error}
            </div>
          )}

          {/* Employee */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-foreground">Employee *</label>
            {initEmpId ? (
              <p className="rounded-xl border border-default bg-subtle px-4 py-2.5 text-sm font-medium text-foreground">
                {initEmpName}
              </p>
            ) : (
              <Select value={empId || ALL} onValueChange={(v) => setEmpId(v === ALL ? "" : v)}>
                <SelectTrigger className="w-full h-[42px] rounded-xl border-default">
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Select employee</SelectItem>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.fullName} ({e.employeeCode})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-foreground">Date *</label>
            {initDate ? (
              <p className="rounded-xl border border-default bg-subtle px-4 py-2.5 text-sm font-medium text-foreground">
                {initDate}
              </p>
            ) : (
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                disabled={readonly}
                className="w-full rounded-xl border border-default bg-white px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 h-[42px]"
              />
            )}
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
                    "rounded-xl border-2 px-4 py-2.5 text-sm font-bold transition-all",
                    status === s ? STATUS_STYLE[s] : `bg-white ${STATUS_INACTIVE[s]}`,
                    readonly ? "opacity-60 cursor-not-allowed" : "cursor-pointer",
                  ].join(" ")}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Note */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-foreground">Note <span className="font-normal text-muted">(optional)</span></label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={readonly}
              placeholder="e.g. Medical leave, sick day…"
              className="w-full rounded-xl border border-default bg-white px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-default">
          {!readonly && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 shadow-sm transition-all"
            >
              {saving ? "Saving…" : isEdit ? "Update" : "Save"}
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-default py-2.5 text-sm font-semibold text-secondary hover:bg-subtle transition-colors"
          >
            {readonly ? "Close" : "Cancel"}
          </button>
        </div>
      </div>
    </div>
  );
}
