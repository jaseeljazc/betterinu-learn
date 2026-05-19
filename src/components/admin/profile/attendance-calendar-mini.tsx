export type ProfileAttendanceRecord = {
  id: string;
  employeeId: string;
  date: string;
  status: string;
  note?: string;
};

const STATUS_CFG: Record<string, { short: string; cls: string }> = {
  Present: { short: "P", cls: "bg-green-500 text-white" },
  Absent: { short: "A", cls: "bg-red-500 text-white" },
  Leave: { short: "L", cls: "bg-amber-500 text-white" },
  Half_Day: { short: "HD", cls: "bg-blue-500 text-white" },
  Holiday: { short: "Holiday", cls: "bg-purple-500 text-white" },
};

// Day header labels — defined once, reused in both skeleton and real render
const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

// Total cells is always 42 (6 rows × 7 cols) for consistent calendar height
const TOTAL_CELLS = 42;

function getMonthParts(month: string) {
  const [year, monthNum] = month.split("-").map(Number);
  const daysInMonth = new Date(year, monthNum, 0).getDate();
  return { year, monthNum, daysInMonth };
}

function isWeekend(date: Date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function statusCounts(records: ProfileAttendanceRecord[]) {
  const present = records.filter((r) => r.status === "Present").length;
  const absent = records.filter((r) => r.status === "Absent").length;
  const leave = records.filter((r) => r.status === "Leave").length;
  const halfDay = records.filter((r) => r.status === "Half_Day").length;
  const clUsed =
    Math.min(1, leave) +
    (leave === 0 && absent === 0 && halfDay % 2 === 1 ? 0.5 : 0);
  const lopDays =
    Math.max(0, leave - 1) +
    absent +
    Math.floor(halfDay / 2) +
    (leave === 0 && absent === 0 && halfDay % 2 === 1
      ? 0
      : (halfDay % 2) * 0.5);

  return { present, absent, leave, halfDay, clUsed, lopDays };
}

export function AttendanceCalendarMini({
  month,
  records,
  loading,
}: {
  month: string;
  records: ProfileAttendanceRecord[];
  loading?: boolean;
}) {
  // ─── Skeleton ────────────────────────────────────────────────────────────
  // Uses the same grid structure and fixed cell height (h-9) as the real
  // calendar so the layout doesn't shift when data loads.
  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        {/* Stat cards — fixed height matches actual card */}
        <div className="grid grid-cols-3 gap-2.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={`stat-${i}`} className="h-[60px] rounded-xl bg-slate-200" />
          ))}
        </div>

        {/* Calendar — same padding/gap/height as real render */}
        <div className="border border-default rounded-xl p-4 bg-subtle/10">
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 text-center text-xs mb-2">
            {DAY_LABELS.map((d) => (
              <div key={d} className="h-6 bg-slate-200 rounded mx-1" />
            ))}
          </div>

          {/* 42 cells with aspect-square */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: TOTAL_CELLS }).map((_, i) => (
              <div key={`cell-${i}`} className="aspect-square rounded-md bg-slate-200" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ─── Real render ─────────────────────────────────────────────────────────
  const { year, monthNum, daysInMonth } = getMonthParts(month);
  const firstDay = new Date(year, monthNum - 1, 1).getDay();

  // Previous-month trailing days
  const prevMonthNum = monthNum === 1 ? 12 : monthNum - 1;
  const prevYear = monthNum === 1 ? year - 1 : year;
  const prevMonthDays = new Date(prevYear, prevMonthNum, 0).getDate();
  const prevDaysStart = prevMonthDays - firstDay + 1;
  const prevMonthDaysList = Array.from({ length: firstDay }, (_, i) => prevDaysStart + i);

  // Current-month days
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Next-month leading days — always pad to exactly TOTAL_CELLS
  const nextMonthCellsCount = TOTAL_CELLS - firstDay - daysInMonth;
  const nextMonthDaysList = Array.from({ length: nextMonthCellsCount }, (_, i) => i + 1);

  const byDate = new Map(records.map((r) => [r.date, r]));
  const summary = statusCounts(records);

  return (
    <div className="space-y-4">
      {/* ── Stat cards ── */}
      <div className="grid grid-cols-3 gap-2.5">
        {[
          { label: "Present", value: summary.present, border: "border-green-200", bg: "bg-green-50/40", hover: "hover:bg-green-50", text: "text-green-600/80", num: "text-green-700" },
          { label: "Absent",  value: summary.absent,  border: "border-red-200",   bg: "bg-red-50/40",   hover: "hover:bg-red-50",   text: "text-red-600/80",   num: "text-red-700"   },
          { label: "Leave",   value: summary.leave,   border: "border-amber-200", bg: "bg-amber-50/40", hover: "hover:bg-amber-50", text: "text-amber-600/80", num: "text-amber-700" },
          { label: "Half-Day",value: summary.halfDay, border: "border-blue-200",  bg: "bg-blue-50/40",  hover: "hover:bg-blue-50",  text: "text-blue-600/80",  num: "text-blue-700"  },
          { label: "LOP Days",value: summary.lopDays, border: "border-rose-200",  bg: "bg-rose-50/40",  hover: "hover:bg-rose-50",  text: "text-rose-600/80",  num: "text-rose-700"  },
          { label: "CL Used", value: summary.clUsed,  border: "border-violet-200",bg: "bg-violet-50/40",hover: "hover:bg-violet-50",text: "text-violet-600/80",num: "text-violet-700"},
        ].map(({ label, value, border, bg, hover, text, num }) => (
          // h-[60px] gives a stable height regardless of content
          <div key={label} className={`h-[60px] rounded-xl border ${border} ${bg} p-2 text-center transition-all ${hover} flex flex-col items-center justify-center gap-0.5`}>
            <div className={`text-[9px] ${text} font-bold uppercase tracking-wider`}>{label}</div>
            <div className={`text-base font-extrabold ${num}`}>{value}</div>
          </div>
        ))}
      </div>

      {/* ── Calendar grid ── */}
      <div className="border border-default rounded-xl p-4 bg-subtle/10">
        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-muted mb-2">
          {DAY_LABELS.map((day) => (
            <div key={day} className="py-1">{day}</div>
          ))}
        </div>

        {/* 42-cell grid — h-9 is fixed so height never changes */}
        <div className="grid grid-cols-7 gap-1">
          {/* Previous-month days */}
          {prevMonthDaysList.map((day) => (
            <div
              key={`prev-${day}`}
              className="aspect-square rounded-md border border-default bg-slate-50/40 px-1 opacity-35"
            >
              <div className="flex h-full flex-col items-center justify-between pt-0.5 pb-2">
                <span className="text-[10px] font-semibold text-muted/60">{day}</span>
                <span className="inline-flex min-h-4 min-w-4 opacity-0">&nbsp;</span>
              </div>
            </div>
          ))}

          {/* Current-month days */}
          {days.map((day) => {
            const date = new Date(year, monthNum - 1, day);
            const dateStr = `${year}-${String(monthNum).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const record = byDate.get(dateStr);
            const cfg = record ? STATUS_CFG[record.status] : undefined;
            const weekend = isWeekend(date);

            return (
              <div
                key={dateStr}
                title={record?.status ?? (weekend ? "Weekend" : "Not marked")}
                className="aspect-square rounded-md border border-default bg-white px-1"
              >
                <div className="flex h-full flex-col items-center justify-between pt-0.5 pb-2">
                  <span className="text-[10px] font-semibold text-muted">{day}</span>
                  <span
                    className={[
                      "inline-flex min-h-4 min-w-4 items-center justify-center rounded px-0.5 text-[10px] font-bold",
                      cfg?.cls ??
                        (weekend
                          ? "bg-subtle text-muted"
                          : "border border-dashed border-default text-muted"),
                    ].join(" ")}
                  >
                    {cfg?.short ?? (weekend ? "-" : "\u00A0")}
                  </span>
                </div>
              </div>
            );
          })}

          {/* Next-month days — always fills remaining cells up to 42 */}
          {nextMonthDaysList.map((day) => (
            <div
              key={`next-${day}`}
              className="aspect-square rounded-md border border-default bg-slate-50/40 px-1 opacity-35"
            >
              <div className="flex h-full flex-col items-center justify-between pt-0.5 pb-2">
                <span className="text-[10px] font-semibold text-muted/60">{day}</span>
                <span className="inline-flex min-h-4 min-w-4 opacity-0">&nbsp;</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}