/**
 * (admin)/layout.tsx
 * Admin portal layout — sidebar navigation + main content area.
 * Applied to all /admin/* pages.
 */
import { AdminLayoutClient } from "@/components/admin/AdminLayoutClient";

export const metadata = { title: "Betterinu Admin" };

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}
