"use client";

import Link from "next/link";
import {
  CheckCircle2,
  ClipboardCheck,
  ExternalLink,
  FileText,
  PlayCircle,
  Wrench,
  HelpCircle,
} from "lucide-react";
import type { CourseId, SubModule } from "@/types";
import { useProgress } from "@/lib/hooks/useProgress";
import { Button } from "@/components/ui/button";

const typeIcons: Record<string, any> = {
  doc: FileText,
  video: PlayCircle,
  exercise: Wrench,
  resource: ExternalLink,
  quiz: HelpCircle,
  assignment: ClipboardCheck,
};

export function SubModuleItem({
  courseId,
  weekId,
  module,
}: {
  courseId: CourseId;
  weekId: string;
  module: SubModule;
}) {
  const { isSubModuleComplete, markSubModuleComplete } = useProgress();
  const complete = isSubModuleComplete(module.id);
  const Icon = typeIcons[module.type] || HelpCircle;

  return (
    <div className="group flex flex-col gap-3 rounded-xl border border-default bg-surface/50 p-3 transition-all hover:bg-white hover:shadow-sm sm:flex-row sm:items-center">
      <Link
        className="flex min-w-0 flex-1 items-center gap-3 rounded-md focus-ring"
        href={`/course/${courseId}/learn/${weekId}/${module.id}`}
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-green-50 text-primary transition-colors group-hover:bg-green-100">
          <Icon className="size-4.5" aria-hidden />
        </span>
        <span className="min-w-0">
          <span className="block truncate font-semibold text-foreground transition-colors group-hover:text-primary">
            {module.title}
          </span>
          <span className="text-[11px] font-bold uppercase tracking-widest text-muted">
            {module.duration}
          </span>
        </span>
      </Link>
  <Button
  onClick={() => markSubModuleComplete(module.id)}
  size="sm"
  type="button"
  variant={complete ? "secondary" : "secondary"}
>
  <span
    className={`flex items-center gap-2 rounded-md px-5 py-2 ${
      complete ? "bg-green-700 text-white" : ""
    }`}
  >
    {complete && <CheckCircle2 className="size-4" aria-hidden />}

    {complete ? "Done" : "Mark Complete"}
  </span>
</Button>
    </div>
  );
}
