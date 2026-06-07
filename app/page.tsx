import { redirect } from "next/navigation";

/**
 * Root page — redirects to the admin login portal.
 * The student frontend lives on a separate Next.js app (student-learn).
 */
export default function RootPage() {
  redirect("/admin/login");
}
