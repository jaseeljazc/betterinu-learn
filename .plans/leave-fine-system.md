# Leave Fine System — Implementation Plan

## What We Are Building

A configurable system where:
- Admin sets a **free leave quota** (e.g. "2 free leaves per month")
- Admin sets a **fine amount** (e.g. ₹500 per extra leave)
- When a student's approved leave **exceeds the quota**, the system **automatically generates a fine**
- Admin can see all fines, mark them as paid/waived
- Student can see their fines in their portal

---

## How the Logic Works (Simple English)

```
Admin configures:
  free_leaves_per_month = 2
  fine_per_extra_leave  = ₹500
  fine_scope            = "monthly"   ← count resets every month

Student takes 3 approved leaves in June:
  Leave 1 → FREE (count: 1 of 2)
  Leave 2 → FREE (count: 2 of 2)
  Leave 3 → FINE of ₹500 auto-generated ✅
```

---

## Step 1: Settings Configuration

### 1A. Add Fine Settings to `app_settings`

Settings stored under key `"student_leave_fines"` in the existing `app_settings` table (no DB change needed for settings storage).

```typescript
// src/lib/app-settings.ts — add new interface
export interface StudentLeaveFineSettings {
  enabled: boolean;                    // master toggle
  free_leaves_per_period: number;      // e.g. 2
  fine_amount: number;                 // e.g. 500 (in rupees)
  fine_period: "monthly" | "yearly";  // when quota resets
  fine_on: "approved" | "applied";    // trigger on approval or on application
}

export const DEFAULT_LEAVE_FINE_SETTINGS: StudentLeaveFineSettings = {
  enabled: false,
  free_leaves_per_period: 2,
  fine_amount: 500,
  fine_period: "monthly",
  fine_on: "approved",
};
```

### 1B. New API Route for Settings

**File:** `app/api/admin/settings/leave-fines/route.ts`

- `GET` — return current settings
- `POST` — update settings (super_admin or admin with settings permission)

### 1C. Admin Settings UI

**File:** `app/(admin)/admin/settings/leave-fines/page.tsx`

A settings form with:
- Enable/Disable toggle
- "Free Leaves per Month/Year" number input
- "Fine Amount (₹)" number input
- "Fine Period" dropdown (Monthly / Yearly)
- "Trigger Fine On" dropdown (On Approval / On Application)
- Save button

Add link to sidebar under `Settings` subItems:
```typescript
{ href: "/admin/settings/leave-fines", label: "Leave Fine Rules" }
```

---

## Step 2: Database — New Table

### `student_leave_fines` table

```sql
CREATE TABLE IF NOT EXISTS student_leave_fines (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id       UUID        NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  leave_request_id UUID        NOT NULL REFERENCES student_leave_requests(id) ON DELETE CASCADE,
  period_label     TEXT        NOT NULL,   -- e.g. "2026-06" or "2026"
  fine_amount      NUMERIC     NOT NULL,
  status           TEXT        NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'paid', 'waived')),
  waive_reason     TEXT,
  resolved_by      UUID        REFERENCES admin_accounts(id),
  resolved_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (leave_request_id)   -- one fine per leave request max
);

CREATE INDEX IF NOT EXISTS idx_slf_student_id ON student_leave_fines (student_id);
CREATE INDEX IF NOT EXISTS idx_slf_status     ON student_leave_fines (status);
CREATE INDEX IF NOT EXISTS idx_slf_period     ON student_leave_fines (period_label);
```

**Migration file:** `scripts/run-migration-030.ts`

---

## Step 3: Fine Trigger Logic

### Where it fires

Fine is generated when a leave request is **approved** by admin.

**File to edit:** `app/api/admin/student-attendance/leave-requests/[id]/route.ts`

After the leave request status is set to `'approved'`, run this logic:

```typescript
// Fine trigger logic (called after approval)
async function checkAndGenerateFine(
  studentId: string,
  leaveRequestId: string,
  approvedDate: string,          // "YYYY-MM-DD"
  settings: StudentLeaveFineSettings
) {
  if (!settings.enabled) return;

  // Build the period label for the quota check
  const [year, month] = approvedDate.split("-");
  const periodLabel = settings.fine_period === "monthly"
    ? `${year}-${month}`   // "2026-06"
    : year;                // "2026"

  // Count approved leaves in this period for this student
  const countResult = settings.fine_period === "monthly"
    ? await sql`
        SELECT COUNT(*) AS count
        FROM student_leave_requests
        WHERE student_id = ${studentId}
          AND status = 'approved'
          AND TO_CHAR(date, 'YYYY-MM') = ${periodLabel}
      `
    : await sql`
        SELECT COUNT(*) AS count
        FROM student_leave_requests
        WHERE student_id = ${studentId}
          AND status = 'approved'
          AND TO_CHAR(date, 'YYYY') = ${periodLabel}
      `;

  const count = Number(countResult[0].count);

  // Generate fine only if quota is exceeded
  if (count > settings.free_leaves_per_period) {
    await sql`
      INSERT INTO student_leave_fines
        (student_id, leave_request_id, period_label, fine_amount, status)
      VALUES
        (${studentId}, ${leaveRequestId}, ${periodLabel}, ${settings.fine_amount}, 'pending')
      ON CONFLICT (leave_request_id) DO NOTHING
    `;
  }
}
```

### Fine cancellation on rejection

If an admin **rejects** a previously approved leave, the fine for that request is automatically waived:

```typescript
// After updating status to 'rejected':
await sql`
  UPDATE student_leave_fines
  SET status = 'waived', waive_reason = 'Leave request was rejected', updated_at = NOW()
  WHERE leave_request_id = ${id} AND status = 'pending'
`;
```

---

## Step 4: Admin Fine Management

### 4A. New API Routes

**`GET /api/admin/student-fines`**
- List all fines (filter by status, student, period)
- Returns: student name, leave date, fine amount, period, status

**`GET /api/admin/students/[id]/fines`**
- All fines for a specific student (shown on student detail page)

**`PATCH /api/admin/student-fines/[id]`**
- Body: `{ action: "paid" | "waived", waive_reason? }`
- Marks the fine as paid or waived

### 4B. Admin UI

**Option A — Student Detail Tab (Recommended)**

Add a "Fines" tab inside the student detail page (`/admin/students/[id]`) showing:
- Period (June 2026)
- Leave date that triggered it
- Fine amount
- Status (Pending / Paid / Waived) badge
- "Mark as Paid" / "Waive" action buttons

**Option B — Global Fines Page**

`app/(admin)/admin/students/fines/page.tsx` — shows all pending fines across all students in a table with filters.

---

## Step 5: Student Visibility

### 5A. New API Route

**`GET /api/student/fines`**
- Returns all fines for the current student

### 5B. Student UI

Show fines inside the student's **attendance page** or a separate "Fines" section:

```
┌─────────────────────────────────────┐
│ ⚠️  Leave Fine — June 2026           │
│ You exceeded the 2 free leave quota  │
│ Fine: ₹500  •  Status: Pending       │
└─────────────────────────────────────┘
```

---

## Implementation Order

| Step | What | Files |
|---|---|---|
| 1 | DB migration — `student_leave_fines` table | `scripts/run-migration-030.ts` |
| 2 | Settings interface + helper | `src/lib/app-settings.ts` |
| 3 | Settings API | `app/api/admin/settings/leave-fines/route.ts` |
| 4 | Settings UI page | `app/(admin)/admin/settings/leave-fines/page.tsx` |
| 5 | Add sidebar link | `src/components/admin/admin-sidebar.tsx` |
| 6 | Fine trigger on approval | `app/api/admin/student-attendance/leave-requests/[id]/route.ts` |
| 7 | Fine cancellation on rejection | Same file as above |
| 8 | Admin fines list API | `app/api/admin/student-fines/route.ts` |
| 9 | Admin fine detail (student page tab) | `src/components/admin/students/student-detail/` |
| 10 | Student fines API | `app/api/student/fines/route.ts` |
| 11 | Student fines UI | `app/(student)/attendance/page.tsx` |

---

## Edge Cases to Handle

| Case | How |
|---|---|
| Admin disables fines mid-month | Existing fines are NOT auto-waived. New ones stop generating. |
| Fine amount changes in settings | Old fines keep their original amount. Only new fines use the new amount. |
| Student has leave approved, then admin switches fine_period from monthly to yearly | Existing fines are unchanged. The new calculation uses the updated period. |
| Student has 2 free leaves, takes Leave A (gets fine), then Leave A is rejected | Fine for Leave A is automatically waived. |
| Leave applied but not yet approved | No fine generated until admin approves. |
