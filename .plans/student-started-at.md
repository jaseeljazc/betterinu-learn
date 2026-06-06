# Plan: Add `started_at` to Student Profile

## Goal
Add a `started_at` (Program Start Date) field to the `students` table.
- Admin sets it manually when **creating** a student.
- Admin can **edit** it when updating a student.
- The date acts as the **catch-up boundary** — the system will never auto-mark absences before this date.
- It shows on both the **admin calendar** and the **student calendar** as "Programme started on [date]".

---

## Step 1: Database Migration

Create `scripts/run-migration-032.ts` (or next available number):

```sql
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS started_at DATE NULL;
```

No default — it is `NULL` for existing students and must be set manually.

---

## Step 2: Backend — Student Create API

**File:** `app/api/admin/students/route.ts` → `POST` handler

1. Destructure `started_at` from the request body.
2. Add `started_at` to the `INSERT INTO students` column list.
3. Add `${started_at ? new Date(started_at) : null}` to the VALUES.

---

## Step 3: Backend — Student Update API

**File:** `app/api/admin/students/[id]/route.ts` → `PATCH` handler

1. Destructure `started_at` from the request body.
2. Add this line to the `UPDATE students SET` block:
   ```sql
   started_at = ${started_at !== undefined ? (started_at ? new Date(started_at) : null) : sql`students.started_at`},
   ```

---

## Step 4: Backend — Student List API

**File:** `app/api/admin/students/route.ts` → `GET` handler

Add `s.started_at` to the SELECT and GROUP BY so it appears in the student list response.

---

## Step 5: Backend — Student Detail API

**File:** `app/api/admin/students/[id]/route.ts` → `GET` handler

The existing `SELECT s.*` already returns all columns, so `started_at` will be included automatically. **No change needed.**

---

## Step 6: Fix catch-up to use `started_at` as boundary

**File:** `src/lib/attendance-fines.ts` → `runCatchUp()`

This is the most important change. Currently if `lastRow` is empty, catch-up defaults to yesterday (meaning it never runs for new students). With `started_at`, we can correctly determine the start of the catch-up window.

**Change the function signature** to also accept `startedAt: string | null`:

```ts
export async function runCatchUp(
  studentId: string,
  attSettings: StudentAttendanceSettings,
  fineSettings: StudentLeaveFineSettings,
  startedAt?: string | null   // <-- ADD THIS
)
```

**Update the startDate fallback logic** (currently lines 63–73):

```ts
// Current: uses lastRow or yesterday
// New: uses lastRow, OR started_at, OR yesterday (whichever is best)

const lastRow = await sql`...`;

let startDate: Date;

if (lastRow.length > 0) {
  // Normal case: continue from the day AFTER the last recorded row
  startDate = new Date(lastRow[0].date as string);
  startDate.setDate(startDate.getDate() + 1);
} else if (startedAt) {
  // New student with no attendance yet: start from their programme start date
  startDate = new Date(startedAt);
} else {
  // Fallback: don't go back further than 30 days to avoid filling months of absences
  const fallback = new Date(nowIST);
  fallback.setDate(fallback.getDate() - 30);
  startDate = fallback;
}
```

---

## Step 7: Pass `startedAt` to every `runCatchUp` caller

There are 3 callers:

### 7a. Student Attendance History
**File:** `app/api/student/attendance/history/route.ts`

Fetch `started_at` from the students table, then pass it:
```ts
const studentRow = await sql`SELECT started_at FROM students WHERE id = ${student.studentId} LIMIT 1`;
const startedAt = studentRow[0]?.started_at ?? null;
await runCatchUp(student.studentId, attSettings, fineSettings, startedAt);
```

### 7b. Student Fines
**File:** `app/api/student/fines/route.ts`

Same as above — fetch `started_at` and pass it to `runCatchUp`.

### 7c. Admin Calendar
**File:** `app/api/admin/student-attendance/calendar/route.ts`

The `studentId` is already available. Fetch `started_at`:
```ts
const studentRow = await sql`SELECT started_at FROM students WHERE id = ${studentId} LIMIT 1`;
const startedAt = studentRow[0]?.started_at ?? null;
await runCatchUp(studentId, attSettings, fineSettings, startedAt);
```

---

## Step 8: Show `started_at` on Admin Calendar UI

**File:** `app/api/admin/student-attendance/calendar/route.ts`

Include `startedAt` in the JSON response:
```ts
return NextResponse.json({
  days,
  summary: { ... },
  startedAt: studentRow[0]?.started_at ?? null,  // <-- ADD
});
```

Then in the admin calendar component, show a banner or marker at the start of the calendar:
- If the viewed month contains `started_at`, show a special info tile or a header note:
  > 📅 Programme started on **5 June 2025**
- Days before `started_at` should render as `"before_start"` status (greyed out, no absent/holiday marking).

---

## Step 9: Show `started_at` on Student Calendar

**File:** `app/api/student/attendance/history/route.ts`

Include `startedAt` in the response. The student calendar page (`app/(student)/attendance/page.tsx`) should:
- Show the same "Programme started on [date]" info banner when relevant.
- Days before `started_at` should appear greyed out with label "Before programme start" — not counted in stats.

---

## Step 10: Admin UI — Create & Edit Forms

### Create Form
**File:** `src/components/admin/students/student-form/student-form.tsx` (or equivalent)

Add a date picker field:
- Label: **"Programme Start Date"**
- Field name: `started_at`
- Type: `date` input
- Required: recommended but not enforced (can be set later)
- Send as ISO string (`YYYY-MM-DD`) in the POST body.

### Edit Form
The admin student detail/edit page (inside `app/(admin)/admin/students/[id]/`) should also include the same `started_at` date field, pre-populated with the existing value, sent in the PATCH body.

---

## Summary of File Changes

| File | Change |
|---|---|
| `scripts/run-migration-032.ts` | Add `started_at DATE NULL` column to `students` |
| `app/api/admin/students/route.ts` | Accept + insert `started_at` on POST; add to GET select |
| `app/api/admin/students/[id]/route.ts` | Accept + update `started_at` on PATCH |
| `src/lib/attendance-fines.ts` | Accept `startedAt` param; use it as catch-up start boundary |
| `app/api/student/attendance/history/route.ts` | Fetch + pass `startedAt` to `runCatchUp`; include in response |
| `app/api/student/fines/route.ts` | Fetch + pass `startedAt` to `runCatchUp` |
| `app/api/admin/student-attendance/calendar/route.ts` | Fetch + pass `startedAt` to `runCatchUp`; include in response |
| Admin calendar component | Show "Programme started on [date]" banner; grey out pre-start days |
| Student calendar page | Show "Programme started on [date]" banner; grey out pre-start days |
| Student create form | Add `started_at` date picker field |
| Admin student edit form | Add `started_at` date picker field (pre-populated) |
