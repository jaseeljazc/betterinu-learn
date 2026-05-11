import { Bell, CheckCircle2, LockOpen, Trophy } from "lucide-react";
import { Card } from "@/components/ui/card";

const items = [
  { icon: CheckCircle2, text: "You completed Day 3 of Week 1" },
  { icon: LockOpen, text: "Week 2 is ready after your quiz pass" },
  { icon: Trophy, text: "You earned the First Quiz badge" },
];

export function NotificationPanel() {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2">
        <Bell className="size-5 text-primary" aria-hidden />
        <h2 className="font-display text-xl font-bold">Recent Activity</h2>
      </div>
      <div className="mt-4 grid gap-3">
        {items.map(({ icon: Icon, text }) => (
          <div className="flex items-center gap-3 rounded-lg bg-subtle p-3 text-sm text-secondary" key={text}>
            <Icon className="size-4 text-success" aria-hidden />
            {text}
          </div>
        ))}
      </div>
    </Card>
  );
}
