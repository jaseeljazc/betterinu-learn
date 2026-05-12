"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Trash2, X, Clock, CheckCircle2, XCircle } from "lucide-react";
import RoboLoader from "@/components/loading/robo-loader";

type StudentDetail = {
  id: string; name: string; email: string; created_at: string;
};
type AssignedCourse = {
  course_id: string; title: string; level: string; duration: string;
  assigned_at: string; completedSubModules: number;
};
type CourseRow = {
  id: string; title: string; curriculum?: any[];
};
type Submission = {
  id: string;
  assignment_id: string;
  course_id: string;
  course_title: string;
  submitted_text: string;
  submitted_at: string;
  status: "pending" | "approved" | "rejected";
  feedback?: string;
};

export default function AdminStudentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [assigned, setAssigned] = useState<AssignedCourse[]>([]);
  const [allCourses, setAllCourses] = useState<CourseRow[]>([]);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [submissions, setSubmissions] = useState<Submission[]>([]);

  async function load() {
    // Load student and assignments
    const res = await fetch(`/api/admin/students/${id}`, { credentials: "include" });
    if (res.ok) {
      const data = await res.json();
      setStudent(data.student);
      setAssigned(data.courses);
    }
    
    // Load all courses from DB
    const coursesRes = await fetch("/api/admin/courses", { credentials: "include" });
    if (coursesRes.ok) {
      const coursesData = await coursesRes.json();
      setAllCourses(coursesData.courses || []);
    }

    // Load submissions
    const subRes = await fetch(`/api/admin/assignments?studentId=${id}`, { credentials: "include" });
    if (subRes.ok) {
      const subData = await subRes.json();
      setSubmissions(subData.submissions || []);
    }
  }

  useEffect(() => { load(); }, [id]);

  const unassignedCourses = allCourses.filter(
    (c) => !assigned.some((a) => a.course_id === c.id),
  );

  async function handleAssign() {
    if (!selectedCourse) return;
    setAssigning(true);
    await fetch(`/api/admin/students/${id}/assign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ courseId: selectedCourse }),
    });
    setSelectedCourse("");
    setAssigning(false);
    load();
  }

  async function handleUnassign(courseId: string) {
    await fetch(`/api/admin/students/${id}/assign/${courseId}`, {
      method: "DELETE",
      credentials: "include",
    });
    load();
  }

  async function handleDelete() {
    if (!confirm(`Delete ${student?.name}? This cannot be undone.`)) return;
    setDeleting(true);
    await fetch(`/api/admin/students/${id}`, { method: "DELETE", credentials: "include" });
    router.push("/admin/students");
  }

  if (!student) {
    return (
      <div className="flex h-64 items-center justify-center">
        <RoboLoader size="md" className="text-[#7a7a62]" />
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/admin/students" className="rounded-lg border border-[#e5e2da] p-2 hover:bg-[#f5f5f0]">
            <ChevronLeft className="size-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{student.name}</h1>
            <p className="text-sm text-[#7a7a62]">{student.email}</p>
            <p className="text-xs text-[#7a7a62]">
              Joined {new Date(student.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
        </div>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
        >
          {deleting ? <RoboLoader size="xs" className="text-current" /> : <Trash2 className="size-4" />}
          Delete student
        </button>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Assigned courses */}
        <div>
          <h2 className="mb-4 text-lg font-semibold">Assigned Courses</h2>
          {assigned.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[#e5e2da] p-6 text-center text-sm text-[#7a7a62]">
              No courses assigned yet.
            </p>
          ) : (
            <div className="space-y-3">
              {assigned.map((c) => {
                const ts = allCourses.find((x) => x.id === c.course_id);
                const curriculum = ts?.curriculum || [];
                const total = curriculum.flatMap((w: any) => 
                  (w.days || []).flatMap((d: any) => d.subModules || [])
                ).length;
                const pct = total ? Math.round((c.completedSubModules / total) * 100) : 0;
                return (
                  <div key={c.course_id} className="flex items-center gap-3 rounded-xl border border-[#e5e2da] bg-white p-4">
                    <div className="flex-1">
                      <p className="font-semibold">{c.title}</p>
                      <p className="mt-0.5 text-xs text-[#7a7a62]">{c.level} · {c.duration}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#e5e2da]">
                          <div className="h-full bg-[#1a4031] rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs font-medium text-[#7a7a62]">
                          {c.completedSubModules}/{total}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleUnassign(c.course_id)}
                      className="shrink-0 rounded-lg border border-[#e5e2da] p-1.5 text-[#7a7a62] hover:border-red-200 hover:text-red-500"
                      title="Remove course"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Submissions */}
          <div className="mt-8">
            <h2 className="mb-4 text-lg font-semibold">Task Submissions</h2>
            {submissions.length === 0 ? (
              <p className="rounded-xl border border-dashed border-[#e5e2da] p-6 text-center text-sm text-[#7a7a62]">
                No submissions yet.
              </p>
            ) : (
              <div className="space-y-3">
                {submissions.map((sub) => {
                  const isPending = sub.status === "pending";
                  const isApproved = sub.status === "approved";
                  return (
                    <div key={sub.id} className="flex flex-col gap-2 rounded-xl border border-[#e5e2da] bg-white p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-sm">{sub.course_title}</p>
                          <code className="text-[11px] bg-[#f5f5f0] border border-[#e5e2da] rounded px-1.5 py-0.5 text-[#7a7a62]">
                            {sub.assignment_id}
                          </code>
                        </div>
                        <span className={`inline-flex items-center gap-1 shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          isPending ? "bg-amber-100 text-amber-700 border-amber-200" :
                          isApproved ? "bg-green-100 text-green-700 border-green-200" :
                          "bg-red-100 text-red-700 border-red-200"
                        }`}>
                          {isPending && <Clock className="size-3" />}
                          {isApproved && <CheckCircle2 className="size-3" />}
                          {!isPending && !isApproved && <XCircle className="size-3" />}
                          {sub.status}
                        </span>
                      </div>
                      
                      <div className="mt-2 text-xs text-[#4a4a3a] bg-[#f9f9f6] p-3 rounded-lg border border-[#e5e2da] whitespace-pre-wrap">
                        {sub.submitted_text}
                      </div>

                      {sub.feedback && (
                        <div className="mt-1 text-[11px] text-[#7a7a62]">
                          <strong className="text-[#4a4a3a]">Feedback:</strong> {sub.feedback}
                        </div>
                      )}
                      
                      <div className="mt-1 text-[10px] text-[#7a7a62]">
                        Submitted {new Date(sub.submitted_at).toLocaleString()}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Assign course */}
        <div>
          <h2 className="mb-4 text-lg font-semibold">Assign a Course</h2>
          {unassignedCourses.length === 0 ? (
            <p className="text-sm text-[#7a7a62]">All courses are already assigned.</p>
          ) : (
            <div className="flex gap-2">
              <select
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                className="flex-1 rounded-lg border border-[#e5e2da] bg-[#f9f9f6] px-3 py-2.5 text-sm outline-none focus:border-[#1a4031]"
              >
                <option value="">Select a course…</option>
                {unassignedCourses.map((c) => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
              <button
                onClick={handleAssign}
                disabled={!selectedCourse || assigning}
                className="flex items-center gap-2 rounded-lg bg-[#1a4031] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
              >
                {assigning ? <RoboLoader size="xs" className="text-current" /> : "Assign"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
