"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Save, AlertCircle, Info } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { StudentLeaveFineSettings } from "@/lib/app-settings";

// Local fallback — must NOT import the value from @/lib/app-settings,
// because that module imports @/lib/db (neon) which cannot run in the browser.
const FALLBACK_SETTINGS: StudentLeaveFineSettings = {
  enabled: false,
  free_leaves_per_period: 2,
  fine_amount: 500,
  fine_period: "monthly",
  fine_on: "approved",
  absent_fine_enabled: false,
  absent_fine_rule: "use_balance",
  absent_fine_amount: 200,
};

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-default bg-white p-5 space-y-4">
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

const API = "/api/admin/settings/leave-fines";

export default function LeaveFineSettingsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery<StudentLeaveFineSettings>({
    queryKey: ["leave-fine-settings"],
    queryFn: () => fetch(API).then((r) => r.json()),
  });

  const [form, setForm] = useState<StudentLeaveFineSettings | null>(null);
  const current = form ?? data ?? FALLBACK_SETTINGS;

  const set = (patch: Partial<StudentLeaveFineSettings>) =>
    setForm((prev) => ({ ...(prev ?? current), ...patch }));

  const mutation = useMutation({
    mutationFn: (body: StudentLeaveFineSettings) =>
      fetch(API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error ?? "Save failed");
      }),
    onSuccess: () => {
      toast.success("Leave fine settings saved.");
      qc.invalidateQueries({ queryKey: ["leave-fine-settings"] });
      setForm(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) return (
    <div className="w-full min-h-screen bg-subtle px-5 lg:px-8 py-6 space-y-4">
      <div className="h-8 w-48 rounded bg-default animate-pulse" />
      <div className="h-4 w-72 rounded bg-default animate-pulse" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {[1,2,3].map(i => <div key={i} className="h-48 rounded-md bg-white border border-default animate-pulse" />)}
      </div>
    </div>
  );

  return (
    <div className="w-full min-h-[calc(100vh-64px)] flex flex-col bg-subtle relative">
      <div className="flex-1 px-5 lg:px-8 py-6">
        {/* Header */}
      <div className="mb-6">
        <h1 className="text-lg font-bold text-foreground">Leave Fine Rules</h1>
        <p className="text-sm text-muted mt-0.5">Automatically fine students who exceed their free leave quota.</p>
      </div>

      <div className="mb-6 flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <AlertCircle className="size-4 shrink-0 mt-0.5 text-amber-600" />
        <div>
          <span className="font-bold">Best Practice: </span>
          Changing fine amounts only affects future fines. To avoid billing confusion, it is highly recommended to only change these settings on the 1st day of the month.
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        {/* Col 1 — Toggle */}
        <SectionCard title="Master Toggle">
          <label className="flex items-center gap-3 cursor-pointer">
            <div
              onClick={() => set({ enabled: !current.enabled })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${current.enabled ? "bg-primary" : "bg-slate-200"}`}
            >
              <span className={`inline-block size-4 rounded-full bg-white shadow transition-transform ${current.enabled ? "translate-x-6" : "translate-x-1"}`} />
            </div>
            <span className="text-sm font-medium text-foreground">
              {current.enabled ? "Fines are enabled" : "Fines are disabled"}
            </span>
          </label>
          <InfoNotice>When disabled, no new fines are generated. Existing fines are not affected.</InfoNotice>
        </SectionCard>

        {/* Col 2 — Quota & Amount */}
        <SectionCard title="Fine Rules">
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Free Leaves per Period</Label>
              <Input
                type="number"
                min={0}
                value={current.free_leaves_per_period}
                onChange={(e) => set({ free_leaves_per_period: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Fine Amount (₹)</Label>
              <Input
                type="number"
                min={0}
                value={current.fine_amount}
                onChange={(e) => set({ fine_amount: Number(e.target.value) })}
              />
            </div>
          </div>
          <InfoNotice>Changing the fine amount only affects future fines.</InfoNotice>
        </SectionCard>

        {/* Col 3 — Period & Trigger + Save */}
        <div className="space-y-4">
          <SectionCard title="Trigger Settings">
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Fine Period</Label>
                <select
                  value={current.fine_period}
                  onChange={(e) => set({ fine_period: e.target.value as "monthly" | "yearly" })}
                  className="w-full rounded-md border border-default bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Trigger Fine On</Label>
                <select
                  value={current.fine_on}
                  onChange={(e) => set({ fine_on: e.target.value as "approved" | "applied" })}
                  className="w-full rounded-md border border-default bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="approved">Leave Approved</option>
                  <option value="applied">Leave Applied</option>
                </select>
              </div>
            </div>
          </SectionCard>


        </div>
      </div>

      {/* Row 2 — Absent Fine Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        <SectionCard title="Absent Fine Toggle">
          <label className="flex items-center gap-3 cursor-pointer">
            <div
              onClick={() => set({ absent_fine_enabled: !current.absent_fine_enabled })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${current.absent_fine_enabled ? "bg-primary" : "bg-slate-200"}`}
            >
              <span className={`inline-block size-4 rounded-full bg-white shadow transition-transform ${current.absent_fine_enabled ? "translate-x-6" : "translate-x-1"}`} />
            </div>
            <span className="text-sm font-medium text-foreground">
              {current.absent_fine_enabled ? "Absent fines enabled" : "Absent fines disabled"}
            </span>
          </label>
          <InfoNotice>When enabled, students will be fined for unexcused absences based on the rule below.</InfoNotice>
        </SectionCard>

        <SectionCard title="Absent Fine Rules">
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Absent Fine Rule</Label>
              <select
                value={current.absent_fine_rule}
                onChange={(e) => set({ absent_fine_rule: e.target.value as "direct_fine" | "use_balance" })}
                className="w-full rounded-md border border-default bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="use_balance">Deduct from Leave Quota First</option>
                <option value="direct_fine">Direct Fine (Ignore Leave Balance)</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Absent Fine Amount (₹)</Label>
              <Input
                type="number"
                min={0}
                value={current.absent_fine_amount}
                onChange={(e) => set({ absent_fine_amount: Number(e.target.value) })}
              />
            </div>
          </div>
          <InfoNotice>
            "Deduct from Quota" uses leave balance to cover absences first — a fine is only generated when balance is exhausted.
          </InfoNotice>
        </SectionCard>
      </div>

      </div>

      {/* Sticky Footer */}
      <div className="sticky bottom-0 z-10 flex justify-end gap-3 border-t border-default bg-white px-5 lg:px-8 py-4 shadow-[0_-4px_10px_rgba(0,0,0,0.03)]">
        {form && (
          <Button
            variant="outline"
            onClick={() => setForm(null)}
            disabled={mutation.isPending}
            className="flex items-center"
          >
            Cancel
          </Button>
        )}
        <Button
          onClick={() => mutation.mutate(current)}
          disabled={mutation.isPending || !form}
          className="flex items-center gap-2"
        >
          {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Save Settings
        </Button>
      </div>
    </div>
  );
}
