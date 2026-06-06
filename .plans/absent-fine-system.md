# Attendance Logic Overhaul & Fine System Plan

## Summary of All Changes

This plan covers 4 interconnected changes:

1. **Remove `Early_Checkout` status** — replace with duration-based Half Day logic
2. **Configurable Half Day Threshold** — new setting for minimum hours to count as Half Day
3. **Absent Fine System** — auto-generate fines for absent days based on a configurable rule
4. **Catch-Up Trigger on View** — blank days are retroactively marked Absent when any attendance data is fetched

---

## Change 1: Remove `Early_Checkout` & Threshold-Based Status

### The Problem
`Early_Checkout` is a redundant status. When someone leaves early, the important question is **how long did they stay?** — not just that they left early.

### New Logic at Punch-Out (`app/api/student/attendance/punch-out/route.ts`)

Replace the existing 4-tier classification with a clean duration-based system:

```
Current Logic (BAD):
  < minHalfDayHours  → Absent
  < fullDayHours     → Half_Day
  left before endTime → Early_Checkout   ← REMOVE THIS
  else               → keep Present/Late

New Logic (GOOD):
  < half_day_min_hours / 2   → Absent
  < half_day_min_hours       → Half_Day
  >= half_day_min_hours      → keep Present / Late  (no Early_Checkout at all)
```

New punch-out status code:
```typescript
if (openRow[0].marked_by === null) {
  const durationMinutes = (now.getTime() - punchInTime.getTime()) / (1000 * 60);
  const halfDayMin = settings.half_day_min_minutes;           // e.g. 240 (4 hours)
  const absentThresholdMin = halfDayMin / 2;                  // e.g. 120 (2 hours)

  if (durationMinutes < absentThresholdMin) {
    status = "Absent";
  } else if (durationMinutes < halfDayMin) {
    status = "Half_Day";
  }
  // else: keep existing status (Present or Late) — they worked enough
}
```

### New Settings Field
Add `half_day_min_minutes: number` to `StudentAttendanceSettings` (default `240` = 4 hours):
```typescript
half_day_min_minutes: 240  // configurable in settings UI
```

**Replaces** the existing `half_day_min_hours` field (rename + convert to minutes for precision).

---

## Change 2: Files to Update for `Early_Checkout` Removal

| File | What to Change |
|---|---|
| `app/api/student/attendance/punch-out/route.ts` | Remove Early_Checkout tier, use minutes-based logic |
| `app/api/admin/student-attendance/mark/route.ts` | Remove `Early_Checkout` from `VALID_STATUSES` array |
| `src/components/admin/students/student-attendance-modal.tsx` | Remove `Early_Checkout` from `STATUSES` array and color maps |
| `src/components/admin/students/student-attendance-view.tsx` | Remove `earlyCheckout` counter and `Early_Checkout` badge config |
| `src/components/admin/students/student-detail/student-attendance-tab.tsx` | Remove `early_checkout` from type union and all switch/case branches |
| `app/(student)/attendance/page.tsx` | Remove `early_checkout` from type union, color logic, legend, and status badge |
| `app/api/student/attendance/history/route.ts` | Remove `earlyCheckout` from summary counter and status mapping |
| `app/api/admin/student-attendance/calendar/route.ts` | Same as above |
| `scripts/update-student-status-constraint.ts` | Remove `Early_Checkout` from DB CHECK constraint |

**DB Migration note:** Existing rows with `Early_Checkout` in the DB should be converted:
```sql
-- Run as part of migration-031
UPDATE student_attendance
SET status = 'Half_Day'
WHERE status = 'Early_Checkout';

-- Then update the constraint
ALTER TABLE student_attendance DROP CONSTRAINT IF EXISTS student_attendance_status_check;
ALTER TABLE student_attendance
  ADD CONSTRAINT student_attendance_status_check
  CHECK (status IN ('Present', 'Late', 'Half_Day', 'Absent', 'Holiday', 'Leave'));
```

---

## Change 3: Settings Update (`src/lib/app-settings.ts`)

### 3A. `StudentAttendanceSettings` — update existing field

```typescript
// RENAME: half_day_min_hours → half_day_min_minutes
// This is more precise and consistent with punch duration calculations
half_day_min_minutes: number;  // default: 240 (4 hours)
```

### 3B. `StudentLeaveFineSettings` — add absent fine fields

```typescript
export interface StudentLeaveFineSettings {
  // ── Existing Leave Fine Settings ───────────────────────────────────────
  enabled: boolean;
  free_leaves_per_period: number;
  fine_amount: number;
  fine_period: "monthly" | "yearly";
  fine_on: "approved" | "applied";

  // ── NEW: Absent Fine Settings ──────────────────────────────────────────
  absent_fine_enabled: boolean;

  absent_fine_rule:
    | "direct_fine"   // Always fine when absent (ignore leave balance)
    | "use_balance";  // Deduct from free leave quota first; fine only when quota is exhausted

  absent_fine_amount: number;  // e.g. 200
}

export const DEFAULT_LEAVE_FINE_SETTINGS: StudentLeaveFineSettings = {
  enabled: false,
  free_leaves_per_period: 2,
  fine_amount: 500,
  fine_period: "monthly",
  fine_on: "approved",
  absent_fine_enabled: false,
  absent_fine_rule: "use_balance",
  absent_fine_amount: 200,
};
```

### 3C. New Helper
```typescript
export async function getStudentLeaveFineSettings(): Promise<StudentLeaveFineSettings> {
  const raw = await getSettings("student_leave_fines");
  return { ...DEFAULT_LEAVE_FINE_SETTINGS, ...raw };
}
```

---

## Change 4: Absent Fine Logic

### 4A. DB Migration (`scripts/run-migration-031.ts`)

```sql
-- Convert existing Early_Checkout rows
UPDATE student_attendance SET status = 'Half_Day' WHERE status = 'Early_Checkout';

-- Update status check constraint
ALTER TABLE student_attendance DROP CONSTRAINT IF EXISTS student_attendance_status_check;
ALTER TABLE student_attendance
  ADD CONSTRAINT student_attendance_status_check
  CHECK (status IN ('Present', 'Late', 'Half_Day', 'Absent', 'Holiday', 'Leave'));

-- Add fine_type and attendance_id to student_leave_fines
ALTER TABLE student_leave_fines
  ADD COLUMN IF NOT EXISTS fine_type TEXT NOT NULL DEFAULT 'leave'
    CHECK (fine_type IN ('leave', 'absent')),
  ADD COLUMN IF NOT EXISTS attendance_id UUID REFERENCES student_attendance(id) ON DELETE SET NULL;

-- Replace old UNIQUE constraint with partial indexes
ALTER TABLE student_leave_fines DROP CONSTRAINT IF EXISTS student_leave_fines_leave_request_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_fine_leave_request
  ON student_leave_fines (leave_request_id)
  WHERE fine_type = 'leave' AND leave_request_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_fine_attendance
  ON student_leave_fines (attendance_id)
  WHERE fine_type = 'absent' AND attendance_id IS NOT NULL;
```

### 4B. Core `processAbsentDay` Helper Function

Create in a shared lib or inline in the routes that need it:

```typescript
export async function processAbsentDay(
  studentId: string,
  attendanceId: string,
  date: string,   // "YYYY-MM-DD"
  fineSettings: StudentLeaveFineSettings,
  attSettings: StudentAttendanceSettings
) {
  if (!fineSettings.absent_fine_enabled) return;

  if (fineSettings.absent_fine_rule === "use_balance") {
    const [year, month] = date.split("-");
    const periodLabel = fineSettings.fine_period === "monthly"
      ? `${year}-${month}` : year;

    // Count approved leaves already used this period
    const usedResult = await sql`
      SELECT COUNT(*) AS count FROM student_leave_requests
      WHERE student_id = ${studentId}
        AND status = 'approved'
        AND TO_CHAR(date, 'YYYY-MM') = ${periodLabel}
    `;
    const used = Number(usedResult[0].count);

    if (used < fineSettings.free_leaves_per_period) {
      // Balance available → auto-create an approved leave to consume it (no fine)
      await sql`
        INSERT INTO student_leave_requests (student_id, date, reason, status, admin_note)
        VALUES (
          ${studentId}, ${date}::date,
          'Auto-deducted for unexcused absence',
          'approved',
          'System generated — leave balance used to cover absence'
        )
        ON CONFLICT (student_id, date) DO NOTHING
      `;
      // Also update the attendance row to show as Leave
      await sql`
        UPDATE student_attendance SET status = 'Leave' WHERE id = ${attendanceId}
      `;
      return; // No fine
    }
  }

  // Either direct_fine OR balance exhausted → generate fine
  await sql`
    INSERT INTO student_leave_fines
      (student_id, attendance_id, fine_type, period_label, fine_amount, status)
    VALUES
      (${studentId}, ${attendanceId}, 'absent', ${date}, ${fineSettings.absent_fine_amount}, 'pending')
    ON CONFLICT (attendance_id) WHERE fine_type = 'absent' DO NOTHING
  `;
}
```

---

## Change 5: Catch-Up on View (Trigger Without Cron)

The "blank column = Absent" rule is enforced at **read time**, not by a background job.

### Where to add the Catch-Up check

Add a `runCatchUp(studentId)` call at the START of these existing API routes before returning data:

| Route | Trigger Condition |
|---|---|
| `GET /api/student/attendance/history` | Student views their own calendar |
| `GET /api/student/fines` | Student views their fines |
| `GET /api/admin/student-attendance/calendar` | Admin views student attendance |

### `runCatchUp` Logic

```typescript
async function runCatchUp(studentId: string, attSettings, fineSettings) {
  const nowIST = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  const yesterday = new Date(nowIST);
  yesterday.setDate(yesterday.getDate() - 1);

  // Get last recorded date for this student
  const lastRow = await sql`
    SELECT date FROM student_attendance
    WHERE student_id = ${studentId}
    ORDER BY date DESC LIMIT 1
  `;

  const startDate = lastRow.length > 0
    ? new Date(lastRow[0].date as string)
    : new Date(yesterday); // no history at all, just check yesterday

  startDate.setDate(startDate.getDate() + 1); // start from day AFTER last record

  const DAY_NUM: Record<string, number> = {
    sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
    thursday: 4, friday: 5, saturday: 6,
  };
  const weekendSet = new Set(
    (attSettings.weekend_days ?? ["sunday"]).map((d: string) => DAY_NUM[d.toLowerCase()] ?? -1)
  );

  for (let d = new Date(startDate); d <= yesterday; d.setDate(d.getDate() + 1)) {
    if (weekendSet.has(d.getDay())) continue; // skip weekends

    const dateStr = d.toISOString().split("T")[0];

    // Check if student had an approved leave for this day (skip if so)
    const leaveCheck = await sql`
      SELECT id FROM student_leave_requests
      WHERE student_id = ${studentId}
        AND date = ${dateStr}::date
        AND status = 'approved'
      LIMIT 1
    `;
    if (leaveCheck.length > 0) continue; // already has approved leave, skip

    // Insert Absent row (ON CONFLICT ensures we don't double-insert)
    const result = await sql`
      INSERT INTO student_attendance (student_id, date, status, note, updated_at)
      VALUES (${studentId}, ${dateStr}::date, 'Absent', 'Auto-marked: no punch-in recorded', NOW())
      ON CONFLICT (student_id, date) DO NOTHING
      RETURNING id
    `;

    if (result.length > 0) {
      await processAbsentDay(studentId, result[0].id, dateStr, fineSettings, attSettings);
    }
  }
}
```

---

## Change 6: Settings UI Update (`app/(admin)/admin/settings/leave-fines/page.tsx`)

Add a new "Absent Fine Settings" section to the existing settings page with:

| Field | Type | Description |
|---|---|---|
| Enable Absent Fines | Toggle | Master switch for absent fine feature |
| Absent Fine Rule | Dropdown | "Direct Fine" or "Deduct from Leave Quota First" |
| Absent Fine Amount (₹) | Number Input | Amount to charge per absent day |

Also update the "Student Attendance Settings" page (`/admin/settings/student-attendance`) to rename the half day threshold field to `half_day_min_minutes` with a label like "Minimum minutes for Half Day (e.g. 240 = 4 hrs)".

---

## Implementation Order

| # | Step | File(s) |
|---|---|---|
| 1 | DB migration (convert Early_Checkout, add fine columns) | `scripts/run-migration-031.ts` |
| 2 | Update `StudentAttendanceSettings` — rename `half_day_min_hours` → `half_day_min_minutes` | `src/lib/app-settings.ts` |
| 3 | Update `StudentLeaveFineSettings` — add absent fine fields | `src/lib/app-settings.ts` |
| 4 | Remove Early_Checkout from punch-out route | `app/api/student/attendance/punch-out/route.ts` |
| 5 | Remove Early_Checkout from admin mark route | `app/api/admin/student-attendance/mark/route.ts` |
| 6 | Remove Early_Checkout from all UI components | `student-attendance-modal.tsx`, `student-attendance-view.tsx`, `student-attendance-tab.tsx`, `attendance/page.tsx` |
| 7 | Remove Early_Checkout from history & calendar API | `history/route.ts`, `calendar/route.ts` |
| 8 | Add `processAbsentDay` helper | `src/lib/attendance-fines.ts` (new shared file) |
| 9 | Add `runCatchUp` helper | `src/lib/attendance-fines.ts` |
| 10 | Hook `runCatchUp` into student history API | `app/api/student/attendance/history/route.ts` |
| 11 | Hook `runCatchUp` into student fines API | `app/api/student/fines/route.ts` |
| 12 | Hook `runCatchUp` into admin calendar API | `app/api/admin/student-attendance/calendar/route.ts` |
| 13 | Update settings UI — half day minutes + absent fine section | `app/(admin)/admin/settings/leave-fines/page.tsx` |

---

## Edge Case Table

| Case | Handled By |
|---|---|
| Student was on approved leave, catch-up runs | `leaveCheck` in `runCatchUp` skips the day |
| Student has leave balance, catch-up marks absent | `processAbsentDay` auto-converts to Leave (no fine) |
| Student has no balance, catch-up marks absent | Fine generated |
| Admin manually marks Absent | Should also call `processAbsentDay` — hook into mark route |
| Admin changes status away from Absent | Waive the pending absent fine for that attendance row |
| Weekend day is blank | `weekendSet` check in `runCatchUp` skips it |
| Student punches in for <2 hrs, punches out | Punch-out sets status to `Absent`, mark route hooks `processAbsentDay` |
| Existing rows with `Early_Checkout` in DB | Migration converts all to `Half_Day` |
