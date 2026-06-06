"use client";

import { useState, useEffect } from "react";
import { X, Loader2, CalendarDays, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface Props {
  onClose: () => void;
  onApplied: () => void;
}

export function LeaveApplyModal({ onClose, onApplied }: Props) {
  // Default date: tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  const [date, setDate]     = useState(tomorrowStr);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");
  const [fineWarning, setFineWarning] = useState<{amount: number; period: string} | null>(null);
  const [checkingFine, setCheckingFine] = useState(true);

  // Check if applying leave will trigger a fine
  useEffect(() => {
    if (!date) return;

    setCheckingFine(true);
    (async () => {
      try {
        // Fetch current month's approved leaves count
        const historyRes = await fetch(
          `/api/student/attendance/history?year=${date.split("-")[0]}&month=${date.split("-")[1]}`,
          { credentials: "include" }
        );
        if (!historyRes.ok) return;
        const historyData = await historyRes.json();
        const approvedLeaves = historyData.summary?.leave || 0;

        // Fetch fine settings (public endpoint or create one)
        const settingsRes = await fetch("/api/student/leave-fine-settings", { credentials: "include" });
        if (!settingsRes.ok) return;
        const settings = await settingsRes.json();

        if (!settings.enabled) {
          setFineWarning(null);
          return;
        }

        // Check if this leave will exceed quota
        const afterApplying = approvedLeaves + 1; // +1 for this new leave request
        if (afterApplying > settings.free_leaves_per_period) {
          const [year, month] = date.split("-");
          const periodLabel = settings.fine_period === "monthly" 
            ? new Date(Number(year), Number(month) - 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" })
            : year;
          setFineWarning({ amount: settings.fine_amount, period: periodLabel });
        } else {
          setFineWarning(null);
        }
      } catch (err) {
        console.error("Failed to check fine warning:", err);
      } finally {
        setCheckingFine(false);
      }
    })();
  }, [date]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!date || !reason.trim()) {
      setError("Please fill in both date and reason.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/student/attendance/leave/apply", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, reason: reason.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to apply");
      toast.success("Leave request submitted");
      onApplied();
    } catch (err: any) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-md shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-default">
          <div className="flex items-center gap-2">
            <CalendarDays className="size-4 text-primary" />
            <h2 className="text-base font-bold text-foreground">Apply for Leave</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-muted hover:text-primary hover:bg-subtle transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5 space-y-4">
            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700 font-medium">
                {error}
              </div>
            )}

            {/* Fine warning loading */}
            {checkingFine && (
              <div className="flex items-center gap-3 rounded-lg border border-default bg-subtle/40 px-4 py-3">
                <Loader2 className="size-4 animate-spin text-muted" />
                <p className="text-xs text-muted">Checking leave quota...</p>
              </div>
            )}

            {/* Fine warning */}
            {!checkingFine && fineWarning && (
              <div className="flex items-start gap-3 rounded-lg border-2 border-amber-400 bg-amber-50 px-4 py-3">
                <AlertCircle className="size-5 shrink-0 mt-0.5 text-amber-600" />
                <div>
                  <p className="font-bold text-amber-900 text-sm">⚠️ Fine Will Be Applied</p>
                  <p className="text-xs text-amber-800 mt-1">
                    If this leave is approved, you will be fined <span className="font-bold">₹{fineWarning.amount}</span> for {fineWarning.period}. You have exceeded your free leave quota.
                  </p>
                </div>
              </div>
            )}

            {/* Date */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-foreground">
                Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full rounded-md border border-default bg-white px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>

            {/* Reason */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-foreground">
                Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder="e.g. Family function, medical appointment…"
                required
                className="w-full rounded-md border border-default bg-white px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-3 px-6 py-4 border-t border-default">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 rounded-md bg-primary py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 shadow-xs transition-all"
            >
              {saving && <Loader2 className="size-4 animate-spin" />}
              {saving ? "Submitting…" : "Submit Request"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-md border border-default py-2.5 text-sm font-semibold text-secondary hover:bg-subtle transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
