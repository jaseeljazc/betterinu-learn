"use client";

import Link from "next/link";
import { CheckCircle2, ExternalLink, FileText, PlayCircle, Wrench } from "lucide-react";
import type { CourseId, SubModule } from "@/types";
import { useProgress } from "@/lib/hooks/useProgress";
import { Button } from "@/components/ui/button";

const typeIcons = {
  doc: FileText,
  video: PlayCircle,
  exercise: Wrench,
  resource: ExternalLink,
};

export function SubModuleItem({ courseId, weekId, module }: { courseId: CourseId; weekId: string; module: SubModule }) {
  const { isSubModuleComplete, markSubModuleComplete } = useProgress();
  const complete = isSubModuleComplete(module.id);
  const Icon = typeIcons[module.type];

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-muted bg-elevated p-3 sm:flex-row sm:items-center">
      <Link className="flex min-w-0 flex-1 items-center gap-3 rounded-md focus-ring" href={`/course/${courseId}/learn/${weekId}/${module.id}`}>
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-subtle text-secondary">
          <Icon className="size-4" aria-hidden />
        </span>
        <span className="min-w-0">
          <span className="block truncate font-semibold text-foreground">{module.title}</span>
          <span className="text-xs uppercase text-muted">{module.duration}</span>
        </span>
      </Link>
      <Button
        onClick={() => markSubModuleComplete(module.id)}
        size="sm"
        type="button"
        variant={complete ? "success" : "secondary"}
      >
        {complete ? <CheckCircle2 className="size-4" aria-hidden /> : null}
        {complete ? "Done" : "Mark Complete"}
      </Button>
    </div>
  );
}
