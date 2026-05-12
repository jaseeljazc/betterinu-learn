"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, AlertCircle, CheckCircle2, Copy } from "lucide-react";
import RoboLoader from "@/components/loading/robo-loader";
import { createStudentAction } from "../actions";

type Course = { id: string; title: string };

export default function NewStudentPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [name, setName] = useState("");
  const [studentCode, setStudentCode] = useState("");
  const [isManualCode, setIsManualCode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successData, setSuccessData] = useState<{ studentId: string; emailSent: boolean; manualData?: any } | null>(null);
  
  useEffect(() => {
    fetch("/api/admin/courses").then(r => r.json()).then(d => setCourses(d.courses || []));
  }, []);

  // Auto-generate student code from name
  useEffect(() => {
    if (!isManualCode) {
      const year = new Date().getFullYear();
      const slug = name
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "-") // Replace non-alphanumeric with hyphens
        .replace(/-+/g, "-")        // Remove duplicate hyphens
        .replace(/^-|-$/g, "");     // Trim hyphens
      
      if (slug) {
        setStudentCode(`STU-${slug}-${year}`);
      } else {
        setStudentCode("");
      }
    }
  }, [name, isManualCode]);

  async function clientAction(formData: FormData) {
    setError("");
    setLoading(true);
    
    const result = await createStudentAction(null, formData);
    
    setLoading(false);
    
    if (result.error) {
      setError(result.error);
    } else if (result.success) {
      setSuccessData({
        studentId: result.studentId,
        emailSent: result.emailSent,
        manualData: result.manualData
      });
      // If email was sent fine, just redirect after a short delay
      if (result.emailSent) {
        setTimeout(() => {
          router.push(`/admin/students/${result.studentId}`);
        }, 1500);
      }
    }
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/admin/students" className="rounded-lg border border-[#e5e2da] p-2 hover:bg-[#f5f5f0]">
          <ChevronLeft className="size-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Add Student</h1>
          <p className="text-sm text-[#7a7a62]">Secure onboarding with automatic identity creation.</p>
        </div>
      </div>

      {successData ? (
        <div className="max-w-md space-y-6">
          <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-center">
            <CheckCircle2 className="mx-auto mb-3 size-10 text-green-600" />
            <h2 className="text-lg font-bold text-green-900">Student Created Successfully!</h2>
            {successData.emailSent ? (
              <p className="mt-2 text-sm text-green-700">The welcome email has been sent to the student. Redirecting...</p>
            ) : (
              <div className="mt-4 text-left">
                <div className="flex items-center gap-2 rounded-lg bg-amber-100 p-3 text-amber-800 text-sm mb-4">
                  <AlertCircle className="size-4 shrink-0" />
                  <p><strong>Warning:</strong> The welcome email failed to send (SMTP error). Please share these credentials manually.</p>
                </div>
                <div className="rounded-lg bg-white p-4 border border-green-200">
                  <p className="text-xs font-bold uppercase text-gray-500 mb-1">Email / Username</p>
                  <p className="font-mono text-sm mb-3 select-all">{successData.manualData?.email}</p>
                  <p className="text-xs font-bold uppercase text-gray-500 mb-1">Temporary Password</p>
                  <p className="font-mono text-sm font-bold text-[#1a4031] select-all">{successData.manualData?.password}</p>
                </div>
                <button 
                  onClick={() => router.push(`/admin/students/${successData.studentId}`)}
                  className="mt-4 w-full rounded-lg bg-[#1a4031] py-2.5 text-sm font-semibold text-white"
                >
                  Continue to Profile
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <form action={clientAction} className="max-w-2xl space-y-6">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <label htmlFor="name" className="block text-sm font-semibold mb-1.5">Full Name *</label>
              <input 
                id="name" name="name" type="text" required placeholder="Aisha Khan" 
                value={name} onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-[#e5e2da] bg-[#f9f9f6] px-3 py-2.5 text-sm outline-none focus:border-[#1a4031] focus:ring-2" 
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-semibold mb-1.5">Email Address *</label>
              <input id="email" name="email" type="email" required placeholder="aisha@example.com" className="w-full rounded-lg border border-[#e5e2da] bg-[#f9f9f6] px-3 py-2.5 text-sm outline-none focus:border-[#1a4031] focus:ring-2" />
            </div>
            <div>
              <label htmlFor="student_code" className="block text-sm font-semibold mb-1.5">Student Code</label>
              <input 
                id="student_code" name="student_code" type="text" 
                placeholder="Auto-generated from name" 
                value={studentCode} 
                onChange={(e) => {
                  setStudentCode(e.target.value.toUpperCase());
                  setIsManualCode(true);
                }}
                className="w-full rounded-lg border border-[#e5e2da] bg-[#f9f9f6] px-3 py-2.5 text-sm outline-none focus:border-[#1a4031] focus:ring-2 font-mono" 
              />
            </div>
            <div>
              <label htmlFor="phone_number" className="block text-sm font-semibold mb-1.5">Phone Number</label>
              <input id="phone_number" name="phone_number" type="tel" placeholder="+1 (555) 000-0000" className="w-full rounded-lg border border-[#e5e2da] bg-[#f9f9f6] px-3 py-2.5 text-sm outline-none focus:border-[#1a4031] focus:ring-2" />
            </div>
            <div>
              <label htmlFor="dob" className="block text-sm font-semibold mb-1.5">Date of Birth</label>
              <input id="dob" name="dob" type="date" className="w-full rounded-lg border border-[#e5e2da] bg-[#f9f9f6] px-3 py-2.5 text-sm outline-none focus:border-[#1a4031] focus:ring-2" />
            </div>
            <div>
              <label htmlFor="gender" className="block text-sm font-semibold mb-1.5">Gender</label>
              <select id="gender" name="gender" className="w-full rounded-lg border border-[#e5e2da] bg-[#f9f9f6] px-3 py-2.5 text-sm outline-none focus:border-[#1a4031] focus:ring-2">
                <option value="">-- Select --</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
                <option value="prefer_not_to_say">Prefer not to say</option>
              </select>
            </div>
            <div>
              <label htmlFor="enrollment_date" className="block text-sm font-semibold mb-1.5">Enrollment Date</label>
              <input id="enrollment_date" name="enrollment_date" type="date" defaultValue={new Date().toISOString().split('T')[0]} className="w-full rounded-lg border border-[#e5e2da] bg-[#f9f9f6] px-3 py-2.5 text-sm outline-none focus:border-[#1a4031] focus:ring-2" />
            </div>
            <div className="md:col-span-2">
              <label htmlFor="address" className="block text-sm font-semibold mb-1.5">Address</label>
              <textarea id="address" name="address" rows={2} placeholder="Full address..." className="w-full rounded-lg border border-[#e5e2da] bg-[#f9f9f6] px-3 py-2.5 text-sm outline-none focus:border-[#1a4031] focus:ring-2" />
            </div>
          </div>

          <div className="border-t border-[#e5e2da] pt-5">
            <label className="block text-sm font-semibold mb-3">Enroll in Courses (Optional)</label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {courses.map((course) => (
                <label
                  key={course.id}
                  className="group relative flex cursor-pointer items-start gap-3 rounded-xl border border-[#e5e2da] bg-white p-4 transition-all hover:border-[#1a4031] hover:bg-[#f9fbf9]"
                >
                  <div className="flex h-5 items-center">
                    <input
                      type="checkbox"
                      name="courseIds"
                      value={course.id}
                      className="size-4 rounded border-[#e5e2da] text-[#1a4031] focus:ring-[#1a4031]"
                    />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-[#1a4031]">{course.title}</span>
                    <span className="text-xs text-[#7a7a62]">Full access to all curriculum modules</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600">
              <AlertCircle className="size-4 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <div className="flex items-center gap-3 pt-4">
            <button
              type="submit" disabled={loading}
              className="flex items-center gap-2 rounded-lg bg-[#1a4031] px-6 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
            >
              {loading ? <RoboLoader size="xs" className="text-current" /> : "Create Student Account"}
            </button>
            <Link href="/admin/students" className="text-sm text-[#7a7a62] hover:text-[#1a4031]">
              Cancel
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}
