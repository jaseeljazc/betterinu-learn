"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Loader2,
  Save,
  Clock,
  AlertCircle,
  Info,
  MessageSquare,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import type { StudentAttendanceSettings } from "@/lib/app-settings";
import { useState } from "react";
import { cn } from "@/lib/utils";

// ── Reusable section card (matches employee-detail-view pattern) ─────────────
function SectionCard({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-md border border-default bg-white p-5 space-y-4 ${className ?? ""}`}>
      <p className="text-xs font-bold text-muted uppercase tracking-wider">{title}</p>
      {children}
    </div>
  );
}

function InfoNotice({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-md border border-default bg-subtle px-3 py-2.5 text-xs font-medium text-secondary">
      <Info className="size-3.5 text-primary shrink-0 mt-0.5" />
      <span>{children}</span>
    </div>
  );
}

function WarnNotice({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs font-medium text-amber-800">
      <AlertCircle className="size-3.5 text-amber-600 shrink-0 mt-0.5" />
      <span>{children}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

const API_URL = "/api/admin/student-attendance/settings";

async function fetchSettings(): Promise<StudentAttendanceSettings> {
  const res = await fetch(API_URL, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to load settings");
  const data = await res.json();
  return data.value;
}

async function saveSettings(value: StudentAttendanceSettings): Promise<void> {
  const res = await fetch(API_URL, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ value }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Failed to save settings");
}

// ─────────────────────────────────────────────────────────────────────────────

const DAYS_OF_WEEK = [
  { key: "sunday",    label: "Sun" },
  { key: "monday",    label: "Mon" },
  { key: "tuesday",   label: "Tue" },
  { key: "wednesday", label: "Wed" },
  { key: "thursday",  label: "Thu" },
  { key: "friday",    label: "Fri" },
  { key: "saturday",  label: "Sat" },
];

export default function StudentAttendanceSettingsPage() {
  const queryClient = useQueryClient();

  const { data: settings, isLoading, isError } = useQuery<StudentAttendanceSettings>({
    queryKey: ["student-attendance-settings"],
    queryFn: fetchSettings,
  });

  // Local draft for editing — mirrors the fetched value
  const [draft, setDraft] = useState<StudentAttendanceSettings | null>(null);

  // Sync draft when fresh data arrives (only if user hasn't started editing)
  const current = draft ?? settings ?? null;

  const saveMutation = useMutation({
    mutationFn: saveSettings,
    onSuccess: () => {
      toast.success("Attendance settings saved");
      queryClient.invalidateQueries({ queryKey: ["student-attendance-settings"] });
      setDraft(null); // reset draft — the refetched value takes over
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function updateField<K extends keyof StudentAttendanceSettings>(
    key: K,
    val: StudentAttendanceSettings[K]
  ) {
    const base = current;
    if (!base) return;
    setDraft({ ...base, [key]: val });
  }

  function toggleWeekendDay(day: string) {
    if (!current) return;
    const curr = current.weekend_days ?? ["sunday"];
    const next = curr.includes(day)
      ? curr.filter((d) => d !== day)
      : [...curr, day];
    updateField("weekend_days", next);
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!current) return;
    saveMutation.mutate(current);
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="w-full min-h-screen bg-subtle px-5 lg:px-8 py-6 space-y-4">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-80" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64 w-full rounded-md" />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !current) {
    return (
      <div className="w-full min-h-screen bg-subtle px-6 lg:px-10 py-10 flex flex-col items-center justify-center">
        <AlertCircle className="size-10 text-red-500 mb-2" />
        <p className="text-sm font-semibold text-foreground">Could not load settings.</p>
      </div>
    );
  }

  // ── Derived values for dynamic hints ──────────────────────────────────────
  const lateThresholdTime = (() => {
    const [h, m] = (current.work_start_time || "09:00").split(":").map(Number);
    if (isNaN(h) || isNaN(m)) return current.work_start_time;
    const total = h * 60 + m + (current.grace_period_minutes ?? 0);
    return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
  })();

  const [startH, startM] = (current.work_start_time || "09:00").split(":").map(Number);
  const [endH, endM] = (current.work_end_time || "18:00").split(":").map(Number);
  const totalMins = endH * 60 + endM - (startH * 60 + startM);
  const mid1Pct = totalMins > 0 ? ((12 * 60 - (startH * 60 + startM)) / totalMins) * 100 : 50;
  const mid2Pct = totalMins > 0 ? ((15 * 60 - (startH * 60 + startM)) / totalMins) * 100 : 75;

  const hasChanges = (() => {
    if (!settings || !current) return false;
    return (
      current.work_start_time !== settings.work_start_time ||
      current.work_end_time !== settings.work_end_time ||
      current.grace_period_minutes !== settings.grace_period_minutes ||
      current.half_day_min_minutes !== settings.half_day_min_minutes ||
      current.half_day_threshold_minutes !== settings.half_day_threshold_minutes ||
      current.early_punch_in_minutes !== settings.early_punch_in_minutes ||
      current.auto_absent_if_no_punchin !== settings.auto_absent_if_no_punchin ||
      JSON.stringify([...(current.weekend_days ?? ["sunday"])].sort()) !== JSON.stringify([...(settings.weekend_days ?? ["sunday"])].sort()) ||
      (current.overtime_message_enabled ?? true) !== (settings.overtime_message_enabled ?? true) ||
      (current.overtime_message_text ?? "") !== (settings.overtime_message_text ?? "")
    );
  })();

  // ── Page ───────────────────────────────────────────────────────────────────
  return (
    <div className="w-full min-h-[calc(100vh-64px)] flex flex-col bg-subtle relative">
      <div className="flex-1 px-5 lg:px-8 py-6">
        {/* Page header */}
      <div className="mb-4">
        <div className="flex items-center gap-3 mb-1">
          <Clock className="size-5 text-primary" />
          <h1 className="font-display text-xl font-bold tracking-tight text-foreground">
            Student Attendance Settings
          </h1>
        </div>
        <p className="text-sm text-secondary">
          Configure office hours, late arrival grace time, and checkout thresholds for students.
        </p>
      </div>

      <div className="mb-6 flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <AlertCircle className="size-4 shrink-0 mt-0.5 text-amber-600" />
        <div>
          <span className="font-bold">Best Practice: </span>
          To avoid confusion with the Catch-Up system and past records, it is highly recommended to only change these settings on the 1st day of the month.
        </div>
      </div>

      <form id="attendance-settings-form" onSubmit={handleSave} className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">

          {/* ── Column 1: Core Schedule + Weekly Off Days ── */}
          <div className="flex flex-col gap-4">
            <SectionCard title="Core Schedule & Mandate">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="work_start_time" className="text-xs font-semibold text-foreground">
                    Start Time <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="work_start_time"
                    type="time"
                    value={current.work_start_time}
                    onChange={(e) => updateField("work_start_time", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="work_end_time" className="text-xs font-semibold text-foreground">
                    End Time <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="work_end_time"
                    type="time"
                    value={current.work_end_time}
                    onChange={(e) => updateField("work_end_time", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="early_punch_in_minutes" className="text-xs font-semibold text-foreground">
                    Early Punch-In Window (minutes) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="early_punch_in_minutes"
                    type="number"
                    min={0}
                    max={120}
                    value={current.early_punch_in_minutes ?? 60}
                    onChange={(e) => updateField("early_punch_in_minutes", Number(e.target.value))}
                    required
                  />
                  <p className="text-[10px] text-muted">
                    How early students can punch in before work start time (e.g., 60 = 1 hour before)
                  </p>
                </div>
              </div>

              {/* Timeline bar */}
              <div className="space-y-1 pt-1">
                <p className="text-[10px] font-medium text-muted text-center">Total configured</p>
                <div className="relative bg-subtle h-2.5 rounded-full border border-default overflow-hidden">
                  <div
                    className="bg-primary h-full rounded-full"
                    style={{ width: "100%" }}
                  />
                </div>
                <div className="relative flex justify-between text-[10px] text-muted font-medium mt-0.5">
                  <span>{current.work_start_time}</span>
                  {mid1Pct > 10 && mid1Pct < 90 && (
                    <span
                      className="absolute"
                      style={{ left: `${mid1Pct}%`, transform: "translateX(-50%)" }}
                    >
                      12:00
                    </span>
                  )}
                  {mid2Pct > 10 && mid2Pct < 90 && (
                    <span
                      className="absolute"
                      style={{ left: `${mid2Pct}%`, transform: "translateX(-50%)" }}
                    >
                      15:00
                    </span>
                  )}
                  <span>{current.work_end_time}</span>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Weekly Off Days">
              <p className="text-xs text-secondary">
                Select which days of the week are treated as holidays.
                Students cannot punch in or apply for leave on these days.
              </p>
              <div className="flex flex-wrap gap-2 mt-1">
                {DAYS_OF_WEEK.map(({ key, label }) => {
                  const active = (current.weekend_days ?? ["sunday"]).includes(key);
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => toggleWeekendDay(key)}
                      className={cn(
                        "rounded-md border px-5 py-2 text-sm font-semibold transition-colors",
                        active
                          ? "bg-primary text-white border-primary shadow-sm"
                          : "bg-white text-secondary border-default hover:bg-subtle hover:text-foreground"
                      )}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              <InfoNotice>
                Currently off:{" "}
                <span className="font-bold text-foreground">
                  {(current.weekend_days ?? ["sunday"])
                    .map((d) => d.charAt(0).toUpperCase() + d.slice(1))
                    .join(", ") || "None"}
                </span>
                {" "}— these days will show as <span className="font-bold text-foreground">Holiday</span> in the calendar.
              </InfoNotice>
            </SectionCard>
          </div>

          {/* ── Column 2: Late Arrival + Overtime Notification ── */}
          <div className="flex flex-col gap-4">
            <SectionCard title="Late Arrival Grace Period">
              <div className="space-y-1.5">
                <Label htmlFor="grace_period_minutes" className="text-xs font-semibold text-foreground">
                  Grace Period (Minutes)
                </Label>
                <Input
                  id="grace_period_minutes"
                  type="number"
                  min={0}
                  value={current.grace_period_minutes}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setDraft((prev) => ({
                      ...(prev ?? current),
                      grace_period_minutes: val,
                    }));
                  }}
                  required
                />
              </div>

              <InfoNotice>
                Dynamic check: A punch-in after{" "}
                <span className="font-bold text-foreground">[{lateThresholdTime}]</span> will be
                classified as LATE.
              </InfoNotice>
            </SectionCard>

            <SectionCard title="Overtime Notification">
              <p className="text-xs text-secondary">
                Show a message on the student dashboard when they are still punched in after
                {" "}<span className="font-semibold text-foreground">{current.work_end_time}</span>{" "}
                (the configured work end time).
              </p>

              {/* Enable toggle */}
              <div className="flex items-center justify-between gap-4 rounded-md border border-default bg-subtle p-3">
                <div className="flex items-center gap-2">
                  <MessageSquare className="size-4 text-primary shrink-0" />
                  <span className="text-sm font-semibold text-foreground">Enable Overtime Message</span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={current.overtime_message_enabled ?? true}
                  onClick={() => updateField("overtime_message_enabled", !(current.overtime_message_enabled ?? true))}
                  className={cn(
                    "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                    (current.overtime_message_enabled ?? true) ? "bg-primary" : "bg-default"
                  )}
                >
                  <span
                    className={cn(
                      "pointer-events-none inline-block size-5 rounded-full bg-white shadow-sm transition-transform duration-200",
                      (current.overtime_message_enabled ?? true) ? "translate-x-5" : "translate-x-0"
                    )}
                  />
                </button>
              </div>

              {/* Message textarea */}
              <div className="space-y-1.5">
                <Label htmlFor="overtime_message_text" className="text-xs font-semibold text-foreground">
                  Message Text
                </Label>
                <textarea
                  id="overtime_message_text"
                  rows={3}
                  maxLength={300}
                  value={current.overtime_message_text ?? ""}
                  onChange={(e) => updateField("overtime_message_text", e.target.value)}
                  disabled={!(current.overtime_message_enabled ?? true)}
                  placeholder="e.g. You've been working past your scheduled hours. Don't forget to rest!"
                  className="w-full resize-none rounded-md border border-default bg-white px-3 py-2 text-sm text-foreground placeholder:text-muted outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <p className="text-right text-[11px] text-muted">
                  {(current.overtime_message_text ?? "").length} / 300 characters
                </p>
              </div>

              <InfoNotice>
                This banner appears on the student&apos;s dashboard when they are punched in after{" "}
                <span className="font-bold text-foreground">{current.work_end_time}</span>.
                Students can dismiss it. The message won&apos;t show if the feature is disabled above.
              </InfoNotice>
            </SectionCard>
          </div>

          {/* ── Column 3: Thresholds & Day Classification ── */}
          <SectionCard title="Thresholds & Day Classification">
            {/* Full-day benchmark */}
            <div className="space-y-3">
              <p className="text-xs font-bold text-foreground">Full-Day Benchmark</p>
              <div className="space-y-1.5">
                <Label htmlFor="half_day_min_minutes" className="text-xs font-semibold text-foreground">
                  Minimum Minutes for Full Day ({current.half_day_min_minutes ?? 240} min = {Math.round((current.half_day_min_minutes ?? 240) / 60 * 10) / 10}h)
                </Label>
                <Input
                  id="half_day_min_minutes"
                  type="number"
                  step={30}
                  min={60}
                  max={720}
                  value={current.half_day_min_minutes ?? 240}
                  onChange={(e) => updateField("half_day_min_minutes", Number(e.target.value))}
                  required
                />
              </div>
              <InfoNotice>
                Staying fewer than{" "}
                <span className="font-bold text-foreground">[{current.half_day_min_minutes ?? 240} min]</span>{" "}
                will count as HALF DAY.
              </InfoNotice>
            </div>

            <div className="border-t border-default" />

            <div className="space-y-3">
              <p className="text-xs font-bold text-foreground">Half-Day Benchmark</p>
              <div className="space-y-1.5">
                <Label htmlFor="half_day_threshold_minutes" className="text-xs font-semibold text-foreground">
                  Minimum Minutes for Half Day ({current.half_day_threshold_minutes ?? 120} min = {Math.round((current.half_day_threshold_minutes ?? 120) / 60 * 10) / 10}h)
                </Label>
                <Input
                  id="half_day_threshold_minutes"
                  type="number"
                  step={30}
                  min={30}
                  max={current.half_day_min_minutes ?? 240}
                  value={current.half_day_threshold_minutes ?? 120}
                  onChange={(e) => updateField("half_day_threshold_minutes", Number(e.target.value))}
                  required
                />
              </div>
              <InfoNotice>
                Staying fewer than{" "}
                <span className="font-bold text-foreground">[{current.half_day_threshold_minutes ?? 120} min]</span>{" "}
                will count as ABSENT.
              </InfoNotice>
            </div>

            <div className="border-t border-default" />


          </SectionCard>
        </div>


        </form>
      </div>

      {/* Sticky Footer */}
      <div className="sticky bottom-0 z-10 flex justify-end gap-3 border-t border-default bg-white px-5 lg:px-8 py-4 shadow-[0_-4px_10px_rgba(0,0,0,0.03)]">
        {hasChanges && (
          <button
            type="button"
            onClick={() => setDraft(null)}
            disabled={saveMutation.isPending}
            className="inline-flex items-center justify-center rounded-md border border-default bg-white px-5 py-2.5 text-sm font-semibold text-secondary hover:bg-slate-50 transition-all shadow-sm"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          form="attendance-settings-form"
          disabled={saveMutation.isPending || !hasChanges}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-all shadow-sm"
        >
          {saveMutation.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          Save Settings
        </button>
      </div>
    </div>
  );
}
