# Holiday Type: Required vs Optional — Implementation Plan

## Concept
When an admin marks a day as "Holiday", they now choose one of two types:

| Type | Meaning | Punch-in Allowed? | Catch-up Marks Absent? |
|---|---|---|---|
| **Required** (Institution Closed) | Everyone must stay home. This is like a weekend. | ❌ No — blocked | ❌ No — skipped |
| **Optional** (They can choose) | Institution is open but attendance is optional. | ✅ Yes — allowed | ❌ No — skipped |

---

## Part 1: Database — Add `holiday_type` column

**Migration file to create:** `scripts/run-migration-029.ts`

```sql
ALTER TABLE student_attendance
  ADD COLUMN IF NOT EXISTS holiday_type TEXT CHECK (holiday_type IN ('required', 'optional'));
```

This new column is only meaningful when `status = 'Holiday'`. For all other statuses it will be NULL.

---

## Part 2: Admin Mark API — Accept `holiday_type`

**File:** `app/api/admin/student-attendance/mark/route.ts`

1. Add `holiday_type?: string` to the body destructuring.
2. When `status === "Holiday"`, require `holiday_type` to be `"required"` or `"optional"`.
3. Save `holiday_type` into the `INSERT / ON CONFLICT UPDATE` query.

---

## Part 3: Punch-In Blocked for Required Holidays

**File:** `app/api/student/attendance/punch-in/route.ts`

The current logic already blocks punch-in when a `marked_by` row exists. We need to refine it:

```
If a row exists for today:
  - If punch_in is already set → "Already punched in"
  - If marked_by is set AND holiday_type = 'required' → "Today is a Required Holiday. Institution is closed."
  - If marked_by is set AND holiday_type = 'optional' → ALLOW punch-in to proceed ✅
  - If marked_by is set AND status is not Holiday → "Manually marked by admin"
```

---

## Part 4: Catch-Up Skips Both Holiday Types

**File:** `src/lib/attendance-fines.ts` — `runCatchUp()`

Currently the catch-up skips days that have an approved leave. It needs to also skip days where:
- `status = 'Holiday'` (regardless of type — **both required and optional holidays should never result in an auto-absent**)

Add a check in the loop:
```sql
SELECT id FROM student_attendance
WHERE student_id = $studentId
  AND date = $dateStr
  AND status = 'Holiday'
LIMIT 1
```

---

## Part 5: Admin UI — Show Holiday Type Choice

**File:** `src/components/admin/students/student-attendance-tab.tsx` (or wherever the admin marks days)

When the admin selects "Holiday" as the status to mark:
- Show a small radio or segmented toggle below the status picker:
  - 🔴 **Required** — "Institution is closed. Students cannot punch in."
  - 🟡 **Optional** — "Students may choose to attend."

---

## Part 6: Calendar UI — Show Holiday Type to Students

**File:** `app/(student)/attendance/page.tsx` or `app/api/student/attendance/history/route.ts`

- The history API should return `holiday_type` on rows where `status = 'Holiday'`.
- On the student calendar, display the holiday day with a note:
  - **Required**: "🏖️ Required Holiday — Institution closed"
  - **Optional**: "🗓️ Optional Holiday — Attendance your choice"

---

## Summary of Files to Touch

| Action | File |
|---|---|
| Create migration | `scripts/run-migration-029.ts` |
| Modify | `app/api/admin/student-attendance/mark/route.ts` |
| Modify | `app/api/student/attendance/punch-in/route.ts` |
| Modify | `src/lib/attendance-fines.ts` |
| Modify | Admin attendance tab (mark day UI) |
| Modify | `app/api/student/attendance/history/route.ts` |
| Modify | `app/(student)/attendance/page.tsx` (calendar display) |
