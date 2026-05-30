import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, UserSquare2 } from "lucide-react"
import { sql } from "@/lib/db"
import { StudentForm } from "@/components/admin/students/student-form/student-form"

async function getStudent(id: string) {
  const rows = await sql`
    SELECT s.*, 
      s.phone AS phone_number,
      s.date_of_birth AS dob,
      sp.highest_qualification, sp.current_status, sp.year_of_passing,
      sp.certification_url, sp.id_proof_url, sp.verification_status,
      sp.verified_by, sp.verified_at
    FROM students s
    LEFT JOIN student_profiles sp ON sp.student_id = s.id
    WHERE s.id = ${id}
  `
  return rows[0] || null
}

export default async function EditStudentPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const student = await getStudent(id)

  if (!student) {
    notFound()
  }

  return (
    <div className="w-full min-h-screen bg-subtle px-6 lg:px-10 py-10">
      <div className="mb-8">
        <Link
          href={`/admin/students/${id}`}
          className="inline-flex items-center gap-2 text-sm text-secondary hover:text-primary mb-4 transition-colors"
        >
          <ArrowLeft className="size-4" /> Back to Student Details
        </Link>
        <div className="flex items-center gap-3 mb-1">
          <UserSquare2 className="size-6 text-primary" />
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
            Edit Student: {student.name}
          </h1>
        </div>
        <p className="text-sm text-secondary">
          Update the profile details and academic information for this student.
        </p>
      </div>

      <StudentForm student={student} />
    </div>
  )
}
