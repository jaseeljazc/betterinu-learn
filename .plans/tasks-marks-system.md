# Admin Marks System Plan

## What We Are Building

Admin can award a **numerical score (0–10)** when reviewing any task submission (standalone or course curriculum). The maximum score is always **10**. The score is displayed to the student as **"8 out of 10"** format on their task cards.

---

## Current State

| Submission Type | Review Route | Gap |
|---|---|---|
| Standalone | `POST /api/admin/standalone-submissions/[id]` | Only approve/reject + feedback. No marks. |
| Course curriculum | existing course submission review route | Same — no marks. |
| Student task cards | `app/(student)/assignments/page.tsx` | No score shown. |

---

## Change 1: DB Migration

**File:** `scripts/run-migration-032.ts`

```sql
-- Add marks_obtained to standalone submissions (max 10)
ALTER TABLE standalone_assignment_submissions
  ADD COLUMN IF NOT EXISTS marks_obtained NUMERIC(4,1) DEFAULT NULL
    CHECK (marks_obtained >= 0 AND marks_obtained <= 10);

-- Add marks_obtained to course assignment submissions (max 10)
ALTER TABLE assignment_submissions
  ADD COLUMN IF NOT EXISTS marks_obtained NUMERIC(4,1) DEFAULT NULL
    CHECK (marks_obtained >= 0 AND marks_obtained <= 10);
```

> The maximum score is always **10** — no `total_marks` configuration needed.

---

## Change 2: Update Review API Routes

### 2A. Standalone Submissions

**File:** `app/api/admin/standalone-submissions/[id]/route.ts`

Update the POST body to accept `marks_obtained`:

```typescript
// Body: { action: 'approve' | 'reject', feedback?: string, marks_obtained?: number | null }
const { action, feedback = "", marks_obtained = null } = await req.json();

await sql`
  UPDATE standalone_assignment_submissions SET
    status         = ${action === "approve" ? "approved" : "rejected"},
    feedback       = ${feedback || null},
    marks_obtained = ${marks_obtained ?? null},
    reviewed_at    = NOW(),
    reviewed_by    = ${admin.adminId}
  WHERE id = ${id}
`;
```

### 2B. Course Assignment Submissions

Find the existing route that handles approve/reject for course assignments (e.g. `app/api/admin/assignments/submissions/[id]/route.ts`) and apply the same change — add `marks_obtained` to the UPDATE query.

---

## Change 3: Admin Review UI — Marks Input

In the admin submission review modal or page (wherever the approve/reject form lives for both standalone and course submissions):

Add a **"Score"** field:

```tsx
{/* Only show if total_marks is configured */}
<div className="space-y-1.5">
  <Label className="text-xs font-semibold">
    Score Awarded
  </Label>
  <div className="flex items-center gap-2">
    <Input
      type="number"
      min={0}
      max={10}
      step={0.5}
      placeholder="0"
      value={marksInput}
      onChange={(e) => setMarksInput(e.target.value)}
      className="w-24"
    />
    <span className="text-sm text-secondary font-medium">
      out of 10
    </span>
  </div>
  <p className="text-[11px] text-muted">
    Leave blank to skip awarding a score.
  </p>
</div>
```

Include `marks_obtained` in the submit payload:
```typescript
body: JSON.stringify({
  action,
  feedback,
  marks_obtained: marksInput !== "" ? Number(marksInput) : null,
})
```

---

## Change 4: Student Task Cards — Show Score

### 4A. Update `GET /api/student/standalone-assignments`

Include `marks_obtained` in the SELECT query:

```sql
sub.marks_obtained
```

### 4B. Update `GET /api/student/course-assignments`

Include `marks_obtained` in the SELECT query:

```sql
s.marks_obtained
```

### 4C. Update Student Task Cards

**File:** `app/(student)/assignments/page.tsx`

Add score badge to both `CourseAssignmentCard` and `StandaloneCard`:

```tsx
{/* Score badge — shown when admin has awarded marks */}
{a.marks_obtained !== null && a.marks_obtained !== undefined && (
  <span className="inline-flex items-center gap-1 rounded-full bg-green-50 border border-green-200 text-green-700 px-2.5 py-0.5 text-[10px] font-bold">
    🏆 {a.marks_obtained} out of 10
  </span>
)}
```

Add `marks_obtained: number | null` to the `StandaloneAssignment` and `CourseAssignment` TypeScript interfaces.

---

## Implementation Order

| # | Step | File |
|---|---|---|
| 1 | DB migration | `scripts/run-migration-032.ts` |
| 2 | Update standalone submission review route | `app/api/admin/standalone-submissions/[id]/route.ts` |
| 3 | Update course submission review route | existing course submission review route |
| 4 | Add marks input to admin review UI | admin submission modal/page |
| 5 | Add `marks_obtained` to student standalone API SELECT | `app/api/student/standalone-assignments/route.ts` |
| 6 | Add `marks_obtained` to student course API SELECT | `app/api/student/course-assignments/route.ts` |
| 7 | Add score badge to student task cards | `app/(student)/assignments/page.tsx` |

---

## Display Format

Score is always shown as:

```
8 out of 10
```

- Maximum is always **10** — fixed, not configurable per task
- Never show the badge if `marks_obtained` is `null` (admin skipped scoring)
- DB enforces `CHECK (marks_obtained >= 0 AND marks_obtained <= 10)`
