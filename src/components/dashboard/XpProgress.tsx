import { Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export function XpProgress({ xp }: { xp: number }) {
  const levelProgress = xp % 500;
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold uppercase text-muted">Total XP</p>
          <p className="mt-2 font-display text-3xl font-bold">{xp}</p>
        </div>
        <Sparkles className="size-8 text-xp" aria-hidden />
      </div>
      <Progress className="mt-4" label="XP level progress" value={(levelProgress / 500) * 100} variant="amber" />
    </Card>
  );
}
