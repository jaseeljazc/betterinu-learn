"use client";

import { useState, useEffect, useRef } from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { toast } from "sonner";
import { DollarSign, Check, X, Loader2, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Fine = {
  id: string;
  student_id: string;
  student_name: string;
  fine_type: "absent" | "leave";
  period_label: string;
  fine_amount: number;
  status: "pending" | "paid" | "waived";
  waive_reason?: string | null;
  created_at: string;
};

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  paid: "bg-green-50 text-green-700 border-green-200",
  waived: "bg-slate-50 text-slate-500 border-slate-200",
};

function fmtDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric", month: "long", year: "numeric",
  });
}

export default function StudentFinesPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [waiveModalId, setWaiveModalId] = useState<string | null>(null);
  const [waiveReason, setWaiveReason] = useState("");
  const observerTarget = useRef<HTMLDivElement>(null);

  // Infinite query
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ["student-fines", statusFilter],
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (pageParam) params.set("cursor", pageParam);
      params.set("limit", "10");
      
      const res = await fetch(`/api/admin/student-fines?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch fines");
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

  const fines = data?.pages.flatMap((page) => page.fines) ?? [];

  const handleMarkPaid = async (id: string) => {
    setActioningId(id);
    try {
      const res = await fetch(`/api/admin/student-fines/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "paid" }),
      });
      if (!res.ok) throw new Error("Failed to mark as paid");
      toast.success("Fine marked as paid");
      queryClient.invalidateQueries({ queryKey: ["student-fines"] });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setActioningId(null);
    }
  };

  const handleWaive = async (id: string) => {
    setActioningId(id);
    try {
      const res = await fetch(`/api/admin/student-fines/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "waived", waive_reason: waiveReason || null }),
      });
      if (!res.ok) throw new Error("Failed to waive fine");
      toast.success("Fine waived");
      setWaiveModalId(null);
      setWaiveReason("");
      queryClient.invalidateQueries({ queryKey: ["student-fines"] });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setActioningId(null);
    }
  };

  const filteredFines = fines.filter((f) =>
    f.student_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <PageWrapper>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <DollarSign className="size-6 text-primary" />
              Student Fines
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage student absence and leave fines
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted" />
              <Input
                type="text"
                placeholder="Search by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-64"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-default rounded-lg px-3 py-2 text-sm bg-white"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="waived">Waived</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white border border-default rounded-xl shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center">
              <Loader2 className="size-6 animate-spin mx-auto text-primary" />
            </div>
          ) : filteredFines.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No fines found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-subtle border-b border-default">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-foreground">Student</th>
                    <th className="px-4 py-3 text-left font-semibold text-foreground">Fine Type</th>
                    <th className="px-4 py-3 text-left font-semibold text-foreground">Date/Period</th>
                    <th className="px-4 py-3 text-right font-semibold text-foreground">Amount</th>
                    <th className="px-4 py-3 text-center font-semibold text-foreground">Status</th>
                    <th className="px-4 py-3 text-center font-semibold text-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-default">
                  {filteredFines.map((fine) => {
                    const isAbsent = fine.fine_type === "absent";
                    const displayDate = isAbsent ? fmtDate(fine.period_label) : fine.period_label;
                    const isPending = fine.status === "pending";
                    const isActioning = actioningId === fine.id;

                    return (
                      <tr key={fine.id} className="hover:bg-subtle/50 transition-colors">
                        <td className="px-4 py-3 font-medium text-foreground">{fine.student_name}</td>
                        <td className="px-4 py-3 text-secondary">
                          {isAbsent ? "Absent Fine" : "Leave Fine"}
                        </td>
                        <td className="px-4 py-3 text-secondary">{displayDate}</td>
                        <td className="px-4 py-3 text-right font-semibold text-foreground">
                          ₹{fine.fine_amount.toLocaleString("en-IN")}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={cn(
                              "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase border",
                              STATUS_BADGE[fine.status]
                            )}
                          >
                            {fine.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {isPending ? (
                            waiveModalId === fine.id ? (
                              <div className="flex items-center gap-2">
                                <Input
                                  type="text"
                                  placeholder="Reason (optional)"
                                  value={waiveReason}
                                  onChange={(e) => setWaiveReason(e.target.value)}
                                  className="text-xs h-8 w-40"
                                  disabled={isActioning}
                                />
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleWaive(fine.id)}
                                  disabled={isActioning}
                                >
                                  {isActioning ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setWaiveModalId(null);
                                    setWaiveReason("");
                                  }}
                                  disabled={isActioning}
                                >
                                  <X className="size-3" />
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 justify-center">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-green-700 border-green-300 hover:bg-green-50"
                                  onClick={() => handleMarkPaid(fine.id)}
                                  disabled={isActioning}
                                >
                                  {isActioning ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
                                  <span className="ml-1">Paid</span>
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-slate-600 border-slate-300 hover:bg-slate-50"
                                  onClick={() => setWaiveModalId(fine.id)}
                                  disabled={isActioning}
                                >
                                  <X className="size-3" />
                                  <span className="ml-1">Waive</span>
                                </Button>
                              </div>
                            )
                          ) : (
                            <span className="text-xs text-muted">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {/* Infinite scroll trigger */}
                  <tr>
                    <td colSpan={6} className="p-0">
                      <div ref={observerTarget} className="h-10 flex items-center justify-center">
                        {isFetchingNextPage && (
                          <Loader2 className="size-5 animate-spin text-primary" />
                        )}
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}
