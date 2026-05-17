import { Bell, CheckCircle2, LockOpen, Trophy } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const items = [
  { icon: CheckCircle2, text: "You completed Day 3 of Week 1", color: "text-green-600" },
  { icon: LockOpen,     text: "Week 2 is ready after your quiz pass", color: "text-blue-500" },
  { icon: Trophy,       text: "You earned the First Quiz badge", color: "text-amber-500" },
];

export function NotificationPanel() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Bell className="size-4 text-primary" aria-hidden />
          <CardTitle className="text-base font-bold">Activity</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="grid gap-2">
        {items.map(({ icon: Icon, text, color }) => (
          <div className="flex items-start gap-3 rounded-sm bg-muted/50 p-3 text-xs leading-snug" key={text}>
            <Icon className={`size-3.5 shrink-0 mt-0.5 ${color}`} aria-hidden />
            <span className="text-muted-foreground">{text}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
