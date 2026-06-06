# Admin Student Fines Management Plan

## Good News: The Backend Already Exists!
The APIs required are already built and fully functional:
- `GET /api/admin/student-fines` — Fetch all fines (filterable by `studentId`, `status`, `period`)
- `PATCH /api/admin/student-fines/[id]` — Mark a fine as `paid` or `waived`

We only need to build **1 new page** and **add 1 sidebar link**.

---

## Part 1: Add Sidebar Link

**File to modify:** `src/components/admin/admin-sidebar.tsx`

Inside the `Students` nav item's `subItems` array (currently has "Directory", "Attendance", "Leave Requests"), add a new entry:

```tsx
...(can("attendance", "view")
  ? [
      { href: "/admin/students/attendance", label: "Attendance", exact: true },
      { href: "/admin/students/attendance/leave-requests", label: "Leave Requests" },
      { href: "/admin/students/fines", label: "Fines" }, // ← ADD THIS
    ]
  : []),
```

Also update the `isSubActive` logic if `/admin/students/fines` needs to be excluded from the "Students" root active check.

---

## Part 2: Create the Fines Page

**New file to create:** `app/(admin)/admin/students/fines/page.tsx`

### Page Features

#### Filters (top bar)
- **Search by student name** — text input
- **Status filter** — dropdown: All / Pending / Paid / Waived
- **Period filter** — month picker (YYYY-MM)

#### Fines Table (main content)
Columns:
| Column | Value |
|---|---|
| Student Name | `student_name` |
| Fine Type | "Absent Fine" or "Leave Fine" (from `fine_type`) |
| Date / Period | `period_label` formatted nicely |
| Amount | `fine_amount` formatted as ₹ |
| Status | Badge: Pending (amber) / Paid (green) / Waived (grey) |
| Actions | Two buttons (only shown if status is `pending`) |

#### Action Buttons (per row)
1. **✓ Mark as Paid** — calls `PATCH /api/admin/student-fines/[id]` with `{ action: "paid" }`. Shows a green confirmation toast.
2. **✕ Waive Fine** — opens a small inline input asking for a `waive_reason` (optional), then calls `PATCH /api/admin/student-fines/[id]` with `{ action: "waived", waive_reason: "..." }`.

### Note on the API
The current `GET /api/admin/student-fines` route uses a `JOIN student_leave_requests` which means it only returns **leave fines** (not absent fines). This needs to be updated to also support absent fines by using a `LEFT JOIN` and pulling from both `leave_request_id` and `attendance_id`.

**Fix in `app/api/admin/student-fines/route.ts`:**
```sql
SELECT
  f.id,
  f.student_id,
  s.name AS student_name,
  f.fine_type,
  f.period_label,
  f.fine_amount,
  f.status,
  f.waive_reason,
  f.created_at
FROM student_leave_fines f
JOIN students s ON s.id = f.student_id
WHERE (... filters ...)
ORDER BY f.created_at DESC
```
(Remove the `JOIN student_leave_requests` — we don't need `leave_date` in the admin list view)

---

## Summary of Files to Create/Modify
| Action | File |
|---|---|
| Modify | `src/components/admin/admin-sidebar.tsx` |
| Fix API | `app/api/admin/student-fines/route.ts` |
| Create | `app/(admin)/admin/students/fines/page.tsx` |
