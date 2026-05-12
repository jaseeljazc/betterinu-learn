import { CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function CompletionBadge({ complete }: { complete: boolean }) {
  return complete ? (
    <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
      <CheckCircle2 className="size-3" aria-hidden />
      Complete
    </Badge>
  ) : (
    <Badge variant="secondary" className="bg-gray-100 text-gray-500">In progress</Badge>
  );
}
