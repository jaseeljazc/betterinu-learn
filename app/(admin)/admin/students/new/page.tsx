import Link from "next/link"
import { ArrowLeft, UserPlus } from "lucide-react"
import { StudentForm } from "@/components/admin/students/student-form/student-form"

export default function NewStudentPage() {
  return (
    <div className="w-full min-h-screen bg-subtle px-6 lg:px-10 py-10">
      <div className="mb-8">
        <Link
          href="/admin/students"
          className="inline-flex items-center gap-2 text-sm text-secondary hover:text-primary mb-4 transition-colors"
        >
          <ArrowLeft className="size-4" /> Back to Students
        </Link>
        <div className="flex items-center gap-3 mb-1">
          <UserPlus className="size-6 text-primary" />
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
            Add New Student
          </h1>
        </div>
        <p className="text-sm text-secondary">
          Fill in the student details below. A welcome email with login
          credentials will be sent automatically.
        </p>
      </div>

      <StudentForm />
    </div>
  )
}
