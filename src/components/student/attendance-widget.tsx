"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ClipboardCheck, Timer, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type AttendanceStatus = {
  punchedIn: boolean;
  hasMarkedAttendance: boolean;
  punchInTime: string | null;
  punchOutTime: string | null;
  isBlocked?: boolean;
  blockedReason?: string | null;
};

export function AttendanceWidget() {
  const [status, setStatus] = useState<AttendanceStatus | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/student/attendance/status", { credentials: "include" })
      .then((res) => res.json())
      .then((data: AttendanceStatus) => {
        setStatus(data);
      })
      .catch(() => {
        setStatus({
          punchedIn: false,
          hasMarkedAttendance: false,
          punchInTime: null,
          punchOutTime: null,
        });
      });
  }, []);

  const handlePunch = async (action: "in" | "out") => {
    setLoading(true);
    try {
      const res = await fetch(`/api/student/attendance/punch-${action}`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          toast.error("Already punched in today");
        } else {
          toast.error(data.error ?? "Something went wrong");
        }
        return;
      }

      if (action === "in") {
        setStatus((prev) => ({
          ...prev!,
          punchedIn: true,
          hasMarkedAttendance: true,
          punchInTime: new Date().toISOString(),
        }));
        toast.success("Attendance marked ✓");
      } else {
        setStatus((prev) => ({
          ...prev!,
          punchedIn: false,
          punchOutTime: new Date().toISOString(),
        }));
        toast.success("Punched out ✓");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (!status) {
    return (
      <div className="mb-6 space-y-2">
        <div className="rounded-md border border-default bg-white p-4">
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    );
  }

  const { punchedIn, hasMarkedAttendance, punchInTime, punchOutTime, isBlocked, blockedReason } = status;

  const formattedTime = punchInTime
    ? new Date(punchInTime).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  const isMarked = hasMarkedAttendance && !punchedIn;

  return (
    <div className="mb-6 space-y-2">
      {/* Main attendance card */}
      <div
        className={cn(
          "flex flex-col gap-4 rounded-md border p-4 sm:flex-row sm:items-center sm:justify-between",
          isBlocked
            ? "bg-slate-50 border-slate-200"
            : punchedIn || isMarked
            ? "bg-green-50 border-green-200"
            : "bg-amber-50 border-amber-200"
        )}
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-full",
              isBlocked ? "bg-slate-100 text-slate-500" :
              punchedIn || isMarked ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
            )}
          >
            {isBlocked ? (
              <ClipboardCheck className="size-5" />
            ) : punchedIn || isMarked ? (
              <ClipboardCheck className="size-5" />
            ) : (
              <Timer className="size-5" />
            )}
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              {isBlocked ? (
                blockedReason ?? "Attendance is disabled for today."
              ) : punchedIn ? (
                `Attendance marked ✓ · Punched in at ${formattedTime}`
              ) : isMarked ? (
                `Attendance marked ✓ · Punched in at ${formattedTime}`
              ) : (
                "You haven't marked attendance yet today."
              )}
            </p>
            {!punchedIn && !isMarked && !isBlocked && (
              <p className="text-xs text-muted-foreground">
                Please punch in to record your attendance.
              </p>
            )}
          </div>
        </div>

        {!isMarked && !isBlocked && (
          <Button
            onClick={() => handlePunch(punchedIn ? "out" : "in")}
            disabled={loading}
            variant={punchedIn ? "outline" : "default"}
            className={cn(
              "shrink-0",
              punchedIn
                ? "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 hover:text-amber-800"
                : "bg-green-600 text-white hover:bg-green-700"
            )}
          >
            {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
            {punchedIn ? "Punch Out" : "Punch In"}
          </Button>
        )}
      </div>

    </div>
  );
}
