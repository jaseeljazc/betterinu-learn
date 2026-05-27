import { redirect } from "next/navigation"

/** Add Admin is now handled via modal on /admin/admins. */
export default function NewAdminPage() {
  redirect("/admin/admins")
}
