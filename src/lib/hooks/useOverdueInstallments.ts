"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import {
  fetchOverdueInstallments,
  fetchCourses,
  recordPayment,
  type OverdueFilterParams,
  type OverdueInstallment,
} from "@/lib/services/student-service"
import type { RecordPaymentPayload } from "@/lib/services/student-service"

export function useAllCourses() {
  return useQuery({
    queryKey: ["admin", "courses"] as const,
    queryFn: fetchCourses,
  })
}

// ── Query key factory ─────────────────────────────────────────────────────────

const overdueKeys = {
  all: ["overdue-installments"] as const,
  filtered: (params: OverdueFilterParams) =>
    ["overdue-installments", params] as const,
}

// ── Hook: list + summary ──────────────────────────────────────────────────────

export function useOverdueInstallments(params: OverdueFilterParams = {}) {
  return useQuery({
    queryKey: overdueKeys.filtered(params),
    queryFn: () => fetchOverdueInstallments(params),
    /** Refresh every 5 minutes so the table stays current without a cron job */
    refetchInterval: 5 * 60 * 1000,
    staleTime: 60 * 1000,
  })
}

// ── Hook: record payment (from overdue table) ─────────────────────────────────

export function useOverdueRecordPayment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: RecordPaymentPayload) => recordPayment(payload),
    onSuccess: (data) => {
      /** Invalidate the overdue list so paid rows vanish */
      queryClient.invalidateQueries({ queryKey: overdueKeys.all })
      /** Also invalidate per-student installment cache if open */
      queryClient.invalidateQueries({ queryKey: ["student", "installments"] })
      toast.success(data.message ?? "Payment recorded successfully.")
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Failed to record payment")
    },
  })
}

// ── Derived helpers ───────────────────────────────────────────────────────────

/** Returns unique courses from an overdue list for the filter dropdown */
export function getUniqueCourses(rows: OverdueInstallment[]) {
  const seen = new Map<string, string>()
  for (const r of rows) {
    if (!seen.has(r.courseId)) seen.set(r.courseId, r.courseTitle)
  }
  return Array.from(seen.entries()).map(([id, title]) => ({ id, title }))
}
