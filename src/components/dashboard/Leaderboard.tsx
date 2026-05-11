import { Trophy } from "lucide-react";
import { Card } from "@/components/ui/card";

const learners = [
  ["1", "Mira", "2,840 XP"],
  ["2", "Aarav", "2,410 XP"],
  ["3", "You", "1,920 XP"],
  ["4", "Neha", "1,700 XP"],
  ["5", "Kabir", "1,560 XP"],
];

export function Leaderboard() {
  return (
    <Card className="p-5">
      <h2 className="font-display text-xl font-bold">Top Learners This Week</h2>
      <div className="mt-4 grid gap-3">
        {learners.map(([rank, name, xp]) => (
          <div
            className={
              name === "You"
                ? "flex items-center gap-3 rounded-lg border border-course bg-course-soft p-3"
                : "flex items-center gap-3 rounded-lg bg-subtle p-3"
            }
            key={rank}
          >
            <span className="grid size-8 place-items-center rounded-full bg-elevated text-sm font-bold">{rank}</span>
            <span className="grid size-9 place-items-center rounded-full bg-surface font-bold">{name[0]}</span>
            <span className="flex-1 font-semibold">{name}</span>
            {Number(rank) <= 3 ? <Trophy className="size-4 text-xp" aria-hidden /> : null}
            <span className="text-sm font-bold text-secondary">{xp}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
