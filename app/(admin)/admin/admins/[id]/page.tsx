import { redirect } from "next/navigation"

/** Edit Admin is now handled via modal on /admin/admins. */
export default function EditAdminPage() {
  redirect("/admin/admins")
}
