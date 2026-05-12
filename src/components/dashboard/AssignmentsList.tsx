"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Clock, XCircle, ClipboardCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";

interface Submission {
  id: string;
  assignment_id: string;
  course_id: string;
  week_id: string;
  day_id: string;
  course_title: string;
  submitted_text: string;
  submitted_at: string;
  status: "pending" | "approved" | "rejected";
  feedback?: string;
}

const STATUS_CONFIG = {
  pending: { Icon: Clock, label: "Pending", textCls: "text-amber-600", bgCls: "bg-amber-100 border-amber-200" },
  approved: { Icon: CheckCircle2, label: "Approved", textCls: "text-green-600", bgCls: "bg-green-100 border-green-200" },
  rejected: { Icon: XCircle, label: "Rejected", textCls: "text-red-600", bgCls: "bg-red-100 border-red-200" },
};

export function AssignmentsList() {
  const [submissions, setSubmissions] = useState<Submission[] | null>(null);

  useEffect(() => {
    fetch("/api/student/assignments", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => setSubmissions(data.submissions ?? []))
      .catch(() => setSubmissions([]));
  }, []);

  if (submissions === null) {
    return (
      <Card>
        <CardContent className="pt-4 space-y-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (submissions.length === 0) return null;

  return (
    <Card>
      <CardContent className="pt-0 pb-0 px-0">
        <div className="divide-y divide-border">
          {submissions.map((sub) => {
            const status = STATUS_CONFIG[sub.status] || STATUS_CONFIG.pending;
            const linkHref = `/course/${sub.course_id}/learn/${sub.week_id}/${sub.assignment_id}`;

            return (
              <Link
                key={sub.id}
                href={linkHref}
                className="flex flex-col p-4 hover:bg-muted/50 transition-colors focus-ring"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm text-foreground truncate">{sub.course_title}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Submitted on {new Date(sub.submitted_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`inline-flex items-center gap-1 shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${status.bgCls} ${status.textCls}`}>
                    <status.Icon className="size-3" />
                    {status.label}
                  </span>
                </div>
                {sub.feedback && (
                  <div className="mt-2 text-xs p-2 rounded bg-surface border border-border text-foreground">
                    <strong className="text-muted-foreground">Feedback:</strong> {sub.feedback}
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
