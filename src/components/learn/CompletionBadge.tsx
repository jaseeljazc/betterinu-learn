import { CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function CompletionBadge({ complete }: { complete: boolean }) {
  return complete ? (
    <Badge variant="success">
      <CheckCircle2 className="size-3" aria-hidden />
      Complete
    </Badge>
  ) : (
    <Badge variant="muted">In progress</Badge>
  );
}
