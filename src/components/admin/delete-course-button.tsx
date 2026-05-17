"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function DeleteCourseButton({ courseId, courseName }: { courseId: string; courseName: string }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete the course "${courseName}"?\n\nThis will permanently remove the course, its curriculum, and all associated data. This action cannot be undone.`)) {
      return;
    }

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/courses/${courseId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete course");
      }

      toast.success("Course deleted successfully");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "An error occurred while deleting the course");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isDeleting}
      className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:border-red-300 hover:bg-red-100 disabled:opacity-50"
      title="Delete Course"
    >
      <Trash2 className="size-3.5" />
      {isDeleting ? "..." : "Delete"}
    </button>
  );
}
