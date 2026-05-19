import { UsersRound } from "lucide-react";

export function StatsBar() {
  return (
    <section className="mt-10 flex flex-col gap-5 border-y border-muted py-6 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-4">
        <div className="flex -space-x-3" aria-hidden>
          {["A", "M", "K", "N"].map((letter) => (
            <span className="grid size-10 place-items-center rounded-full border-2 border-background bg-primary-light text-sm font-semibold text-primary" key={letter}>
              {letter}
            </span>
          ))}
        </div>
        <p className="font-display text-[22px] font-medium">Join 200+ learners already enrolled</p>
      </div>
      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="font-display text-2xl font-medium text-primary">4</p>
          <p className="text-xs uppercase text-muted">Tracks</p>
        </div>
        <div>
          <p className="font-display text-2xl font-medium text-primary">30+</p>
          <p className="text-xs uppercase text-muted">Modules</p>
        </div>
        <div>
          <p className="flex items-center justify-center gap-1 font-display text-2xl font-medium text-primary">
            <UsersRound className="size-5" aria-hidden />
            200+
          </p>
          <p className="text-xs uppercase text-muted">Students</p>
        </div>
      </div>
    </section>
  );
}
