# Retroactive Leave Fine Fix Plan

## Objective
When a student is auto-marked "Absent" by the catch-up system, an "Absent Fine" is automatically generated. If the student later applies for leave for that *same date* and the admin approves it, the system changes the attendance to "Leave", but the "Absent Fine" remains pending. We need to automatically waive this fine upon leave approval.

## The Bug
1. A student misses Monday and gets automatically marked absent with a ₹200 pending fine on Tuesday morning.
2. The student applies for leave for Monday retroactively.
3. The Admin clicks "Approve" on the leave request.
4. The system successfully changes the attendance from "Absent" to "Leave".
5. However, it forgets to delete the Absent Fine that was generated on Tuesday morning.

## The Fix
We need to update the leave approval API so that when an admin approves a leave request, the system runs a quick check: *"Is there an existing Absent Fine for this exact date? If yes, waive it automatically."*

## Implementation Details

**File to modify:** `app/api/admin/student-attendance/leave-requests/[id]/route.ts`

**Changes Required:**
1. Locate the block where `action === "approved"` is handled.
2. After inserting or updating the `student_attendance` table to `'Leave'`, add an `UPDATE` query targeting the `student_leave_fines` table.
3. The query should match fines that are:
    - For this specific `student_id`
    - `fine_type` = `'absent'`
    - `period_label` = the exact date of the leave (`leaveReq.date`)
    - `status` = `'pending'`
4. Set the status of matching fines to `'waived'` and add a `waive_reason` of `"Retroactive leave approved"`.

**SQL Query Example:**
```sql
await sql`
  UPDATE student_leave_fines
  SET status = 'waived',
      waive_reason = 'Retroactive leave approved',
      updated_at = NOW()
  WHERE student_id = ${leaveReq.student_id}
    AND fine_type = 'absent'
    AND period_label = ${leaveReq.date}
    AND status = 'pending'
`;
```

## How Things Will Work After the Fix
* **Automatic Cleanup**: When an admin clicks "Approve" on a leave request, the student's attendance changes from **Absent** to **Leave**, and the system instantly changes any associated fine's status from **Pending** to **Waived** (with a note saying "Retroactive leave approved").
* **No Double Penalties**: The student's pending fine balance will immediately drop. They won't see a warning banner asking them to pay for a day that was just approved as a valid leave.
* **No Manual Work for Admins**: Admins won't have to navigate to a separate "Fines" page to manually track down and delete absent fines. It happens completely automatically.
