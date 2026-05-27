export type ProfileAttendanceRecord = {
  id: string;
  employeeId: string;
  date: string;
  status: string;
  note?: string;
};

// ─── Status config ────────────────────────────────────────────────────────────
// Each status carries:
//   label  – human-readable text shown inside the cell
//   cellBg – full-cell tint (Tailwind bg utility)
//   cellBorder – subtle border matching the tint
//   numCls – date number color
//   badgeCls – label color
//   dotCls – color for the legend dot and stat card dot
//   statNum – number color in the stat card
const STATUS_CFG: Record<
  string,
  {
    label: string;
    cellBg: string;
    cellBorder: string;
    numCls: string;
    badgeCls: string;
    dotColor: string;
    statNumColor: string;
  }
> = {
  Present: {
    label: "Present",
    cellBg: "bg-green-50",
    cellBorder: "border-green-200",
    numCls: "text-green-700",
    badgeCls: "text-green-800",
    dotColor: "#22c55e",
    statNumColor: "#15803d",
  },
  Absent: {
    label: "Absent",
    cellBg: "bg-red-50",
    cellBorder: "border-red-200",
    numCls: "text-red-700",
    badgeCls: "text-red-800",
    dotColor: "#ef4444",
    statNumColor: "#b91c1c",
  },
  Leave: {
    label: "Leave",
    cellBg: "bg-amber-50",
    cellBorder: "border-amber-200",
    numCls: "text-amber-700",
    badgeCls: "text-amber-800",
    dotColor: "#f59e0b",
    statNumColor: "#b45309",
  },
  Half_Day: {
    label: "Half-day",
    cellBg: "bg-blue-50",
    cellBorder: "border-blue-200",
    numCls: "text-blue-700",
    badgeCls: "text-blue-800",
    dotColor: "#3b82f6",
    statNumColor: "#1d4ed8",
  },
  Holiday: {
    label: "Holiday",
    cellBg: "bg-purple-50",
    cellBorder: "border-purple-200",
    numCls: "text-purple-700",
    badgeCls: "text-purple-800",
    dotColor: "#a855f7",
    statNumColor: "#7e22ce",
  },
};

const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const TOTAL_CELLS = 42; // 6 rows × 7 cols — fixed height

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getMonthParts(month: string) {
  const [year, monthNum] = month.split("-").map(Number);
  const daysInMonth = new Date(year, monthNum, 0).getDate();
  return { year, monthNum, daysInMonth };
}

function isWeekend(date: Date) {
  const d = date.getDay();
  return d === 0 || d === 6;
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

// ─── Stat card config ─────────────────────────────────────────────────────────
const STAT_CARDS = [
  {
    key: "present" as const,
    label: "Present",
    dotColor: STATUS_CFG.Present.dotColor,
    numColor: STATUS_CFG.Present.statNumColor,
  },
  {
    key: "absent" as const,
    label: "Absent",
    dotColor: STATUS_CFG.Absent.dotColor,
    numColor: STATUS_CFG.Absent.statNumColor,
  },
  {
    key: "leave" as const,
    label: "Leave",
    dotColor: STATUS_CFG.Leave.dotColor,
    numColor: STATUS_CFG.Leave.statNumColor,
  },
  {
    key: "halfDay" as const,
    label: "Half-day",
    dotColor: STATUS_CFG.Half_Day.dotColor,
    numColor: STATUS_CFG.Half_Day.statNumColor,
  },
  {
    key: "lopDays" as const,
    label: "LOP Days",
    dotColor: "#D4537E",
    numColor: "#993556",
  },
  {
    key: "clUsed" as const,
    label: "CL Used",
    dotColor: STATUS_CFG.Holiday.dotColor,
    numColor: STATUS_CFG.Holiday.statNumColor,
  },
];

// ─── Legend items shown in the calendar header ────────────────────────────────
const LEGEND_ITEMS = [
  { status: "Present", label: "Present" },
  { status: "Absent", label: "Absent" },
  { status: "Leave", label: "Leave" },
  { status: "Half_Day", label: "Half-day" },
  { status: "Holiday", label: "Holiday" },
];

// ─── Component ───────────────────────────────────────────────────────────────
export function AttendanceCalendarMini({
  month,
  records,
  loading,
}: {
  month: string;
  records: ProfileAttendanceRecord[];
  loading?: boolean;
}) {
  // ── Skeleton ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        {/* Stat cards skeleton */}
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={`stat-${i}`} className="h-[68px] rounded-xl bg-slate-200" />
          ))}
        </div>

        {/* Calendar skeleton */}
        <div className="border border-default rounded-xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-default">
            <div className="h-4 w-24 rounded bg-slate-200" />
            <div className="h-3 w-48 rounded bg-slate-200" />
          </div>
          {/* Day labels */}
          <div className="grid grid-cols-7 gap-1 px-3 pt-3 pb-1">
            {DAY_LABELS.map((d) => (
              <div key={d} className="h-4 rounded bg-slate-200" />
            ))}
          </div>
          {/* Cells */}
          <div className="grid grid-cols-7 gap-1 px-3 pb-3">
            {Array.from({ length: TOTAL_CELLS }).map((_, i) => (
              <div key={`cell-${i}`} className="aspect-square rounded-md bg-slate-200" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Real render ───────────────────────────────────────────────────────────
  const { year, monthNum, daysInMonth } = getMonthParts(month);
  const firstDay = new Date(year, monthNum - 1, 1).getDay();

  // Previous-month trailing days
  const prevMonthDays = new Date(
    monthNum === 1 ? year - 1 : year,
    monthNum === 1 ? 12 : monthNum - 1,
    0
  ).getDate();
  const prevDaysList = Array.from(
    { length: firstDay },
    (_, i) => prevMonthDays - firstDay + 1 + i
  );

  // Current-month days
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Next-month leading days — fills remaining cells to exactly TOTAL_CELLS
  const nextDaysList = Array.from(
    { length: TOTAL_CELLS - firstDay - daysInMonth },
    (_, i) => i + 1
  );

  const byDate = new Map(records.map((r) => [r.date, r]));
  const summary = statusCounts(records);

  // Format month label, e.g. "May 2026"
  const monthLabel = new Date(year, monthNum - 1, 1).toLocaleDateString(
    "en-US",
    { month: "long", year: "numeric" }
  );

  return (
    <div className="space-y-4">
      {/* ── Stat cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-2">
        {STAT_CARDS.map(({ key, label, dotColor, numColor }) => (
          <div
            key={key}
            className="flex flex-col items-center justify-center gap-1 rounded-xl border border-default bg-white px-2 py-2.5 h-[68px]"
          >
            {/* Colored dot — matches calendar cell color */}
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: dotColor }}
            />
            <span className="text-[9px] font-semibold uppercase tracking-widest text-muted">
              {label}
            </span>
            <span
              className="text-lg font-semibold leading-none"
              style={{ color: numColor }}
            >
              {summary[key]}
            </span>
          </div>
        ))}
      </div>

      {/* ── Calendar ───────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-default overflow-hidden bg-white">
        {/* Header: month name + inline legend */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-default px-4 py-3">
          <span className="text-sm font-medium text-primary">{monthLabel}</span>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {LEGEND_ITEMS.map(({ status, label }) => {
              const cfg = STATUS_CFG[status];
              return (
                <span
                  key={status}
                  className="flex items-center gap-1 text-[10px] text-muted"
                >
                  <span
                    className="inline-block h-2 w-2 rounded-[2px]"
                    style={{ background: cfg.dotColor }}
                  />
                  {label}
                </span>
              );
            })}
            {/* Weekend indicator */}
            <span className="flex items-center gap-1 text-[10px] text-muted">
              <span className="inline-block h-2 w-2 rounded-[2px] bg-slate-200" />
              Weekend
            </span>
          </div>
        </div>

        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 gap-1 px-2.5 pt-2.5 pb-1">
          {DAY_LABELS.map((day, i) => (
            <div
              key={day}
              className={[
                "text-center text-[10px] font-semibold py-0.5",
                i === 0 || i === 6 ? "text-muted/60" : "text-muted",
              ].join(" ")}
            >
              {day}
            </div>
          ))}
        </div>

        {/* 42-cell grid */}
        <div className="grid grid-cols-7 gap-1 px-2.5 pb-2.5">
          {/* Previous-month trailing days */}
          {prevDaysList.map((day) => (
            <div
              key={`prev-${day}`}
              className="aspect-square rounded-md border border-default bg-slate-50/60 opacity-30 flex flex-col items-center justify-between px-1 pt-1 pb-1.5"
            >
              <span className="text-[10px] font-medium text-muted">{day}</span>
              <span className="text-[9px] text-muted/50" />
            </div>
          ))}

          {/* Current-month days */}
          {days.map((day) => {
            const date = new Date(year, monthNum - 1, day);
            const dateStr = `${year}-${String(monthNum).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const record = byDate.get(dateStr);
            const cfg = record ? STATUS_CFG[record.status] : undefined;
            const weekend = isWeekend(date);

            // Cell appearance
            const cellBg = cfg
              ? cfg.cellBg
              : weekend
                ? "bg-slate-100"
                : "bg-white";
            const cellBorder = cfg
              ? cfg.cellBorder
              : "border-default";
            const numCls = cfg
              ? cfg.numCls
              : weekend
                ? "text-muted/60"
                : "text-muted";
            const badgeCls = cfg
              ? cfg.badgeCls
              : weekend
                ? "text-muted/40"
                : "text-transparent"; // empty for unmarked weekdays

            return (
              <div
                key={dateStr}
                title={
                  record
                    ? `${dateStr} — ${cfg?.label ?? record.status}`
                    : weekend
                      ? `${dateStr} — Weekend`
                      : `${dateStr} — Not marked`
                }
                className={[
                  "aspect-square rounded-md border flex flex-col items-center justify-between px-0.5 pt-1 pb-1.5",
                  cellBg,
                  cellBorder,
                ].join(" ")}
              >
                {/* Date number */}
                <span className={`text-[10px] font-semibold ${numCls}`}>
                  {day}
                </span>

                {/* Status label — full word, no cryptic initials */}
                <span
                  className={[
                    "text-[8px] font-semibold leading-none text-center",
                    badgeCls,
                  ].join(" ")}
                >
                  {cfg ? cfg.label : weekend ? "—" : ""}
                </span>
              </div>
            );
          })}

          {/* Next-month leading days */}
          {nextDaysList.map((day) => (
            <div
              key={`next-${day}`}
              className="aspect-square rounded-md border border-default bg-slate-50/60 opacity-30 flex flex-col items-center justify-between px-1 pt-1 pb-1.5"
            >
              <span className="text-[10px] font-medium text-muted">{day}</span>
              <span className="text-[9px] text-muted/50" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}