import { Trophy } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

const learners = [
  ["1", "Mira", "2,840 XP"],
  ["2", "Aarav", "2,410 XP"],
  ["3", "You", "1,920 XP"],
  ["4", "Neha", "1,700 XP"],
  ["5", "Kabir", "1,560 XP"],
];

export function Leaderboard() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-bold">Top Learners</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2">
        {learners.map(([rank, name, xp]) => (
          <div
            className={`flex items-center gap-2.5 rounded-sm p-2 text-sm transition-colors ${
              name === "You"
                ? "bg-primary/8 ring-1 ring-primary/20"
                : "bg-muted/50 hover:bg-muted"
            }`}
            key={rank}
          >
            <span className="grid size-5 shrink-0 place-items-center text-[11px] font-bold text-muted-foreground">{rank}</span>
            <Avatar className="size-7 border border-border">
              <AvatarFallback className={`text-[11px] font-bold ${name === "You" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                {name[0]}
              </AvatarFallback>
            </Avatar>
            <span className="flex-1 truncate font-medium">{name}</span>
            {Number(rank) <= 3 && <Trophy className="size-3.5 text-amber-500 shrink-0" aria-hidden />}
            <span className="text-xs font-bold text-muted-foreground shrink-0">{xp}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
