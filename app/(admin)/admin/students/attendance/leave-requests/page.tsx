"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { toast } from "sonner";
import {
  CalendarDays,
  Check,
  X,
  Clock,
  User,
  FileText,
  Loader2,
  ChevronDown,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────────────── */
/* Types                                                    */
/* ─────────────────────────────────────────────────────── */

type LeaveRequest = {
  id: string;
  date: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  admin_note?: string | null;
  created_at: string;
  reviewed_at?: string | null;
  student_id: string;
  student_name: string;
  student_email: string;
  reviewer_name?: string | null;
};

type StudentSummary = {
  absent: number;
  leave: number;
  pending: number;
};

const STATUS_BADGE: Record<string, string> = {
  pending:  "bg-sky-50 text-sky-700 border-sky-200",
  approved: "bg-green-50 text-green-700 border-green-200",
  rejected: "bg-red-50 text-red-600 border-red-200",
};

function fmtDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric", month: "long", year: "numeric",
  });
}
function timeAgo(iso: string) {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return "just now";
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

/* ─────────────────────────────────────────────────────── */
/* Review Modal                                             */
/* ─────────────────────────────────────────────────────── */

function ReviewModal({
  request,
  action,
  summary,
  onClose,
  onDone,
}: {
  request: LeaveRequest;
  action: "approved" | "rejected";
  summary: StudentSummary | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [adminNote, setAdminNote] = useState("");
  const [saving, setSaving]       = useState(false);
  const [warningMsg, setWarningMsg] = useState("");
  const [finePreview, setFinePreview] = useState<{amount: number; period: string} | null>(null);

  // Check if fine will be triggered on approval
  useEffect(() => {
    if (action !== "approved" || !summary) return;
    
    (async () => {
      try {
        const res = await fetch("/api/admin/settings/leave-fines", { credentials: "include" });
        if (!res.ok) return;
        const settings = await res.json();
        
        if (!settings.enabled) return;
        
        // summary.leave = approved leaves this month/year (depending on period)
        const currentApproved = summary.leave;
        const afterApproval = currentApproved + 1;
        
        if (afterApproval > settings.free_leaves_per_period) {
          const [year, month] = request.date.split("-");
          const periodLabel = settings.fine_period === "monthly" 
            ? new Date(Number(year), Number(month) - 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" })
            : year;
          setFinePreview({ amount: settings.fine_amount, period: periodLabel });
        }
      } catch (err) {
        console.error("Failed to check fine preview:", err);
      }
    })();
  }, [action, summary, request.date]);

  async function handleConfirm() {
    setSaving(true);
    setWarningMsg("");
    try {
      const res = await fetch(
        `/api/admin/student-attendance/leave-requests/${request.id}`,
        {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, admin_note: adminNote }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      
      if (data.warning) {
        setWarningMsg(data.warning);
        setTimeout(() => {
          toast.success("Leave approved ✓");
          onDone();
        }, 3000);
      } else {
        toast.success(action === "approved" ? "Leave approved ✓" : "Leave rejected");
        onDone();
      }
    } catch (err: any) {
      toast.error(err.message);
      setSaving(false);
    }
  }

  const isApprove = action === "approved";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-md shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-default">
          <h2 className="text-base font-bold text-foreground">
            {isApprove ? "Approve Leave Request" : "Reject Leave Request"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-muted hover:text-primary hover:bg-subtle transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Student info */}
          <div className="rounded-md border border-default bg-subtle/40 px-4 py-3 space-y-1">
            <p className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <User className="size-3.5 text-primary" />
              {request.student_name}
            </p>
            <p className="text-xs text-muted">{request.student_email}</p>
          </div>

          {/* Request details */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CalendarDays className="size-4 text-muted shrink-0" />
              <span className="text-sm font-semibold text-foreground">
                {fmtDate(request.date)}
              </span>
            </div>
            
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted">
                Reason for Leave
              </label>
              <div className="flex items-start gap-2.5 rounded-md border border-default bg-white px-3 py-2.5">
                <FileText className="size-4 text-primary shrink-0 mt-0.5" />
                <span className="text-sm font-medium text-foreground leading-relaxed">{request.reason}</span>
              </div>
            </div>
          </div>

          {/* Student summary */}
          {summary && (
            <div className="rounded-md border border-default bg-subtle/40 px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted mb-2">
                This Month's Record
              </p>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded bg-red-50 border border-red-100 py-1.5">
                  <p className="font-bold text-red-700 text-base leading-none">{summary.absent}</p>
                  <p className="text-muted text-[10px] mt-0.5">Absent</p>
                </div>
                <div className="rounded bg-indigo-50 border border-indigo-100 py-1.5">
                  <p className="font-bold text-indigo-700 text-base leading-none">{summary.leave}</p>
                  <p className="text-muted text-[10px] mt-0.5">Leave</p>
                </div>
                <div className="rounded bg-sky-50 border border-sky-100 py-1.5">
                  <p className="font-bold text-sky-700 text-base leading-none">{summary.pending}</p>
                  <p className="text-muted text-[10px] mt-0.5">Pending</p>
                </div>
              </div>
            </div>
          )}

          {/* Fine warning banner - before approval */}
          {isApprove && finePreview && !warningMsg && (
            <div className="flex items-start gap-3 rounded-lg border-2 border-amber-400 bg-amber-50 px-4 py-3">
              <AlertCircle className="size-5 shrink-0 mt-0.5 text-amber-600" />
              <div>
                <p className="font-bold text-amber-900 text-sm">⚠️ Fine Will Be Generated</p>
                <p className="text-xs text-amber-800 mt-1">
                  Approving this leave will generate a fine of <span className="font-bold">₹{finePreview.amount}</span> for {finePreview.period}. The student has exceeded their free leave quota.
                </p>
              </div>
            </div>
          )}

          {/* Fine warning banner - after approval */}
          {warningMsg && (
            <div className="flex items-start gap-3 rounded-lg border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-800">
              <AlertCircle className="size-4 shrink-0 mt-0.5 text-green-600" />
              <div>
                <p className="font-bold">Leave Approved - Fine Generated</p>
                <p className="text-xs mt-1">{warningMsg}</p>
              </div>
            </div>
          )}

          {/* Admin note */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-foreground">
              Note <span className="font-normal text-muted">(optional)</span>
            </label>
            <input
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              placeholder={isApprove ? "e.g. Approved, take care" : "e.g. Please provide medical certificate"}
              className="w-full rounded-md border border-default bg-white px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-default">
          <button
            onClick={handleConfirm}
            disabled={saving}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 rounded-md py-2.5 text-sm font-semibold text-white shadow-xs disabled:opacity-50 transition-all",
              isApprove ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"
            )}
          >
            {saving && <Loader2 className="size-4 animate-spin" />}
            {saving ? "Saving…" : isApprove ? "Approve" : "Reject"}
          </button>
          <button
            onClick={onClose}
            className="flex-1 rounded-md border border-default py-2.5 text-sm font-semibold text-secondary hover:bg-subtle transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────── */
/* Page                                                     */
/* ─────────────────────────────────────────────────────── */

export default function LeaveRequestsAdminPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<"" | "pending" | "approved" | "rejected">("");
  const [modal, setModal] = useState<{
    request: LeaveRequest;
    action: "approved" | "rejected";
    summary: StudentSummary | null;
  } | null>(null);
  
  const observerTarget = useRef<HTMLDivElement>(null);

  // Infinite query
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch,
  } = useInfiniteQuery({
    queryKey: ["leave-requests", statusFilter],
    queryFn: async ({ pageParam }) => {
      const qs = new URLSearchParams();
      if (statusFilter) qs.set("status", statusFilter);
      if (pageParam) qs.set("cursor", pageParam);
      qs.set("limit", "20");
      
      const res = await fetch(`/api/admin/student-attendance/leave-requests?${qs}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined as string | undefined,
  });

  // Intersection observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const requests = data?.pages.flatMap((page) => page.requests) ?? [];

  async function openModal(request: LeaveRequest, action: "approved" | "rejected") {
    // Fetch student summary for this month
    const now = new Date();
    const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    let summary: StudentSummary | null = null;
    try {
      const res = await fetch(
        `/api/admin/student-attendance/leave-requests?studentId=${request.student_id}`,
        { credentials: "include" }
      );
      const data = await res.json();
      const reqs: LeaveRequest[] = data.requests ?? [];
      const thisMonth = reqs.filter((r) => r.date.startsWith(monthStr));
      summary = {
        absent:  0, // will be computed from attendance separately if needed
        leave:   thisMonth.filter((r) => r.status === "approved").length,
        pending: thisMonth.filter((r) => r.status === "pending").length,
      };
    } catch {}
    setModal({ request, action, summary });
  }

  const pending  = requests.filter((r) => r.status === "pending").length;
  const approved = requests.filter((r) => r.status === "approved").length;
  const rejected = requests.filter((r) => r.status === "rejected").length;

  return (
    <PageWrapper>
      <div className="w-full px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <CalendarDays className="size-6 text-primary" />
              Leave Requests
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Review and approve or reject student leave applications.
            </p>
          </div>

          {/* Filter */}
          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-auto">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="h-9 w-full sm:w-auto rounded-md border border-default bg-white pl-3 pr-8 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 appearance-none"
              >
                <option value="">All Requests</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-2.5 size-4 text-muted" />
            </div>
          </div>
        </div>

        {/* Summary Chips */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: "Pending",  count: pending,  cls: "bg-sky-50 border-sky-200 text-sky-700" },
            { label: "Approved", count: approved, cls: "bg-green-50 border-green-200 text-green-700" },
            { label: "Rejected", count: rejected, cls: "bg-red-50 border-red-200 text-red-700" },
          ].map(({ label, count, cls }) => (
            <div key={label} className={`flex items-center gap-3 rounded-md border p-4 ${cls}`}>
              <div>
                <p className="text-2xl font-bold leading-none">{count}</p>
                <p className="text-xs font-semibold mt-0.5 opacity-70">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="rounded-md border border-default bg-white overflow-hidden">
          {isLoading ? (
            <div className="p-10 text-center text-muted text-sm animate-pulse">
              Loading leave requests…
            </div>
          ) : requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted gap-3">
              <Clock className="size-10 opacity-25" />
              <p className="text-sm">No leave requests found</p>
            </div>
          ) : (
            <div className="divide-y divide-default">
              {requests.map((req) => (
                <div
                  key={req.id}
                  className="flex flex-col sm:flex-row sm:items-start gap-4 px-5 py-4 hover:bg-subtle/30 transition-colors"
                >
                  {/* Left: student + details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-foreground">{req.student_name}</p>
                      <span
                        className={cn(
                          "text-[10px] font-bold uppercase px-2 py-0.5 rounded border",
                          STATUS_BADGE[req.status]
                        )}
                      >
                        {req.status}
                      </span>
                    </div>
                    <p className="text-xs text-muted mt-0.5">{req.student_email}</p>
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      <span className="flex items-center gap-1 text-xs text-secondary">
                        <CalendarDays className="size-3" />
                        {fmtDate(req.date)}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-muted">
                        <Clock className="size-3" />
                        {timeAgo(req.created_at)}
                      </span>
                    </div>
                    <p className="text-xs text-secondary mt-1.5 italic">"{req.reason}"</p>
                    {req.admin_note && (
                      <p className="text-xs text-muted mt-1">
                        Admin note: <span className="italic">{req.admin_note}</span>
                        {req.reviewer_name && <span className="ml-1">— {req.reviewer_name}</span>}
                      </p>
                    )}
                  </div>

                  {/* Right: action buttons (only for pending) */}
                  {req.status === "pending" && (
                    <div className="flex items-center gap-2 shrink-0 mt-2 sm:mt-0 w-full sm:w-auto justify-end sm:justify-start">
                      <button
                        onClick={() => openModal(req, "approved")}
                        className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 rounded-md border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700 hover:bg-green-100 transition-colors"
                      >
                        <Check className="size-3.5" /> Approve
                      </button>
                      <button
                        onClick={() => openModal(req, "rejected")}
                        className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 transition-colors"
                      >
                        <X className="size-3.5" /> Reject
                      </button>
                    </div>
                  )}
                </div>
              ))}
              
              {/* Infinite scroll trigger */}
              <div ref={observerTarget} className="h-10 flex items-center justify-center">
                {isFetchingNextPage && (
                  <Loader2 className="size-5 animate-spin text-primary" />
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {modal && (
        <ReviewModal
          request={modal.request}
          action={modal.action}
          summary={modal.summary}
          onClose={() => setModal(null)}
          onDone={() => {
            setModal(null);
            queryClient.invalidateQueries({ queryKey: ["leave-requests"] });
          }}
        />
      )}
    </PageWrapper>
  );
}
