import { Flame } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function StreakBanner({ streak }: { streak: number }) {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <span className="grid size-10 shrink-0 place-items-center rounded-sm bg-orange-100 text-orange-600">
              <Flame className="size-5 animate-xp-pop" aria-hidden />
            </span>
            <div>
              <p className="font-bold text-foreground">
                {streak > 0 ? `${streak}-day streak 🔥` : "No streak yet"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {streak > 0 ? "Complete any module today to keep momentum." : "Start a lesson to begin your streak!"}
              </p>
            </div>
          </div>

          <div className="flex gap-1.5">
            {days.map((day, index) => (
              <div key={day} className="flex flex-col items-center gap-1">
                <div
                  className={`size-8 rounded-sm grid place-items-center text-[10px] font-bold transition-all ${
                    index < streak
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {index < streak ? <Flame className="size-3.5" /> : <span>{day[0]}</span>}
                </div>
                <span className="text-[9px] text-muted-foreground">{day}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
