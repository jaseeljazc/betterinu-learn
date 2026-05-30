"use client"

import { useQuery } from "@tanstack/react-query"
import { fetchStudentFee } from "@/lib/services/student-fee-service"

/**
 * Returns the authenticated student's fee enrollments.
 * Caches under ["student", "fee"] — invalidate this key after any payment action.
 */
export function useStudentFee() {
  return useQuery({
    queryKey: ["student", "fee"],
    queryFn: fetchStudentFee,
    select: (data) => data.enrollments,
    staleTime: 30_000,
  })
}
