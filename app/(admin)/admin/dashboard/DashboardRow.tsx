"use client";

import { useRouter } from "next/navigation";
import { BookMarked, BookOpen, Clock } from "lucide-react";

export function DashboardRow({ row, status }: { row: any; status: any }) {
  const router = useRouter();
  const isStandalone = row.submission_type === "standalone";

  return (
    <tr
      onClick={() => {
        if (isStandalone) {
          router.push(`/admin/standalone-assignments?tab=submissions&id=${row.id}`);
        } else {
          router.push(`/admin/submissions?id=${row.id}`);
        }
      }}
      className="hover:bg-subtle/50 transition-colors cursor-pointer"
    >
      <td className="px-5 py-3 font-semibold text-foreground whitespace-nowrap">
        {row.student_name as string}
      </td>
      <td className="px-5 py-3 text-foreground font-medium max-w-[220px] truncate">
        {row.course_title as string}
      </td>
      <td className="px-5 py-3">
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${isStandalone ? "bg-purple-50 text-purple-700 border-purple-200" : "bg-blue-50 text-blue-700 border-blue-200"}`}>
          {isStandalone ? <BookMarked className="size-3" /> : <BookOpen className="size-3" />}
          {isStandalone ? "Standalone" : "Course"}
        </span>
      </td>
      <td className="px-5 py-3">
        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${status.className}`}>
          {status.label}
        </span>
      </td>
      <td className="px-5 py-3 text-secondary whitespace-nowrap">
        <span className="flex items-center gap-1.5">
          <Clock className="size-3 text-muted" />
          {new Date(row.submitted_at as string).toLocaleDateString("en-GB", {
            day: "numeric", month: "short", year: "numeric",
          })}
        </span>
      </td>
    </tr>
  );
}
