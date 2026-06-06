"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState } from "react";

type Fine = {
  id: string;
  fine_type: "absent" | "leave";
  period_label: string;
  fine_amount: number;
  status: "pending" | "paid" | "waived";
  waive_reason?: string | null;
  leave_date?: string | null;
  created_at: string;
};

function statusBadge(status: Fine["status"]) {
  return (
    <span
      className={cn(
        "text-[10px] font-bold uppercase px-2 py-0.5 rounded border",
        status === "pending" && "bg-amber-50 text-amber-700 border-amber-200",
        status === "paid"    && "bg-green-50 text-green-700 border-green-200",
        status === "waived"  && "bg-slate-50 text-slate-500 border-slate-200"
      )}
    >
      {status}
    </span>
  );
}

function fmtPeriod(label: string) {
  if (label.length === 7) {
    const [y, m] = label.split("-");
    const date = new Date(Number(y), Number(m) - 1);
    return date.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  }
  return label;
}

export function StudentFinesTab({ studentId }: { studentId: string }) {
  const qc = useQueryClient();
  const [waiveReason, setWaiveReason] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery<{ fines: Fine[] }>({
    queryKey: ["student-fines", studentId],
    queryFn: () =>
      fetch(`/api/admin/student-fines?studentId=${studentId}`).then((r) => r.json()),
  });

  const resolve = useMutation({
    mutationFn: ({ id, action, reason }: { id: string; action: "paid" | "waived"; reason?: string }) =>
      fetch(`/api/admin/student-fines/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, waive_reason: reason }),
      }).then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error ?? "Failed");
      }),
    onSuccess: () => {
      toast.success("Fine updated.");
      qc.invalidateQueries({ queryKey: ["student-fines", studentId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) return <div className="p-6"><Loader2 className="size-4 animate-spin text-muted" /></div>;

  const fines = data?.fines ?? [];

  if (fines.length === 0) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        No fines recorded for this student.
      </div>
    );
  }

  return (
    <div className="divide-y divide-default">
      {fines.map((fine) => {
        const isAbsent = fine.fine_type === "absent";
        const dateLabel = isAbsent ? "Absent on:" : "Leave date:";
        const dateValue = isAbsent ? fine.period_label : fine.leave_date;
        
        return (
          <div key={fine.id} className="flex items-start justify-between gap-4 p-4">
            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "text-[10px] font-bold uppercase px-1.5 py-0.5 rounded",
                    isAbsent ? "bg-red-50 text-red-700" : "bg-orange-50 text-orange-700"
                  )}
                >
                  {isAbsent ? "Absence Fine" : "Leave Fine"}
                </span>
                {statusBadge(fine.status)}
              </div>
              <span className="text-sm font-semibold text-foreground block">
                {fmtPeriod(fine.period_label)}
              </span>
              {dateValue && (
                <p className="text-xs text-muted-foreground">
                  {dateLabel}{" "}
                  {new Date(dateValue).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              )}
              <p className="text-sm font-bold text-foreground">₹{Number(fine.fine_amount).toLocaleString("en-IN")}</p>
              {fine.waive_reason && (
                <p className="text-xs text-muted italic">Waive reason: {fine.waive_reason}</p>
              )}
            </div>

            {fine.status === "pending" && (
              <div className="flex flex-col gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-green-700 border-green-300 hover:bg-green-50"
                  disabled={resolve.isPending}
                  onClick={() => resolve.mutate({ id: fine.id, action: "paid" })}
                >
                  Mark as Paid
                </Button>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    placeholder="Waive reason…"
                    value={waiveReason[fine.id] ?? ""}
                    onChange={(e) =>
                      setWaiveReason((prev) => ({ ...prev, [fine.id]: e.target.value }))
                    }
                    className="w-32 rounded border border-default px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary/30"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-slate-600 border-slate-300 hover:bg-slate-50"
                    disabled={resolve.isPending}
                    onClick={() =>
                      resolve.mutate({
                        id: fine.id,
                        action: "waived",
                        reason: waiveReason[fine.id],
                      })
                    }
                  >
                    Waive
                  </Button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
