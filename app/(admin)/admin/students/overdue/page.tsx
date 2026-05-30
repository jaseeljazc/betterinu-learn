import { AlertCircle } from "lucide-react"

import { OverdueDashboard } from "@/components/admin/overdue/overdue-dashboard"

export const metadata = {
  title: "Overdue Payments — Admin",
  description: "Track and manage all overdue student fee installments.",
}

export default function OverduePage() {
  return (
    <div className="w-full min-h-screen bg-subtle px-6 lg:px-10 py-10">
      {/* Page header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <AlertCircle className="size-6 text-red-600" />
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
            Overdue Payments
          </h1>
        </div>
        <p className="text-sm text-secondary">
          All installments past their due date (including grace period). 
        </p>
      </div>

      {/* Interactive dashboard — client component */}
      <OverdueDashboard />
    </div>
  )
}
