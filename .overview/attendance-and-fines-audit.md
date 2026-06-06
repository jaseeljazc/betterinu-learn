# Attendance & Fines System - Overview and Audit

═══════════════════════════════════════════════
## PART 1: HOW THE SYSTEM WORKS
═══════════════════════════════════════════════

### A) Daily Attendance Flow
*   **Punching In**: A student clicks punch-in on their dashboard. The system checks:
    *   **Early Punch-In Window**: Students can only punch in within `early_punch_in_minutes` before their start time.
    *   **Duplicate check**: Have they already punched in today?
    *   **Admin override**: Has an admin already manually marked today (e.g., as a Holiday)? If so, punch-in is blocked.
    *   **Weekend check**: Is today configured as a `weekend_days` (e.g., Sunday)? If so, punch-in is blocked.
    *   **IP Trust**: If the student's IP is unknown, it still allows the punch-in but asynchronously notifies the admin.
*   **Status on Punch In**: 
    *   If the punch-in time is past the `work_start_time` + `grace_period_minutes`, the status is set to **"Late"**.
    *   Otherwise, it is set to **"Present"**.
*   **Punching Out**: When the student punches out, the system calculates the duration worked and the exact checkout time:
    *   If they worked less than `half_day_threshold_minutes`, status becomes **"Absent"**.
    *   If they leave *before* the official `work_end_time` OR they worked less than `half_day_min_minutes`, status becomes **"Half_Day"**.
    *   Otherwise, the status remains whatever it was at punch-in ("Present" or "Late").

### B) Auto-Absent Detection (Catch-Up System)
Think of this as an automatic "clean-up" helper. Instead of running on a strict schedule (like every midnight), it runs silently in the background whenever needed.

*   **The Master Switch**: `auto_absent_if_no_punchin` dictates whether the system automatically marks missing days as absent. 
*   **When does it run?**: The moment a student opens their Attendance Calendar or Fines page.
*   **What does it do?**: Looks for any past days (since enrollment `started_at`) where the student completely forgot to punch in.
*   **What does it skip?**: Skips configured `weekend_days` and days where the student already has an approved leave.
*   **The Result**: Fills empty days as "Absent" and checks if it needs to generate a fine.

### C) Leave System
*   **Flow**: Students apply for leave with a date and reason. The request stays "pending".
*   **Approval**: An admin reviews the request. 
    *   If **approved**: The system inserts an attendance row for that date with the status **"Leave"**. It waives any pending "Absent" fines for that date. It then checks if the student exceeded their free leave quota to generate a "Leave" fine.
    *   If **rejected**: The request is denied (no fine waivers).

### D) Fine System
There are two distinct types of fines:
*   **Leave Fines**: Triggered during leave approval if total approved leaves exceed `free_leaves_per_period`.
*   **Absent Fines**: Triggered when the catch-up system auto-marks a day as Absent.
    *   `direct_fine`: Student is immediately fined `absent_fine_amount`.
    *   `use_balance`: System deducts one free leave instead. If balance is 0, they get fined.

### E) What Students See
*   **Calendar**: Visual grid color-coded by status. Future and pre-enrollment days are grayed out.
*   **Day Details**: Exact punch-in/out times, duration, and admin notes.
*   **Fine History**: Detailed list of all fines (pending, paid, waived) with exact dates and reasons.

<br>

═══════════════════════════════════════════════
## PART 2: REMAINING EDGE CASES
═══════════════════════════════════════════════

*All critical edge cases have been resolved or confirmed as intended business logic!*

<br>

<br>

═══════════════════════════════════════════════
## PART 3: RECENTLY RESOLVED ISSUES
═══════════════════════════════════════════════

| What was happening | How it was fixed |
|---|---|
| **Early Punch-in Exploit**: Students could punch in hours before their shift started to artificially inflate their work duration. | Added `early_punch_in_minutes` admin setting and integrated it into `/api/student/attendance/punch-in`. |
| **Retroactive Leaves Didn't Clear Absent Fines**: Admin approves a retroactive leave, but the "Absent" fine remained pending forever. | In `leave-requests/[id]/route.ts`, an `UPDATE` query now automatically waives pending Absent fines on that specific date upon leave approval. |
| **Missing Fine Transparency**: Students only saw a total fine amount and couldn't tell why they were being billed. | Created a comprehensive "Fine History" UI for students showing specific dates, types (Absent vs Leave), and waive reasons. Added `/admin/students/fines` page for Admins to easily manage, waive, or mark fines as paid. |
| **Setting Changes Affect Existing Logic**: Mid-month config changes (like weekends or fine amounts) caused confusion. | Mitigated. Added prominent UI warning banners advising Admins that changes only affect *future* fines and should be done on the 1st of the month. |
| **New Students Auto-Absences Bug**: System marked dates *before* a student's enrollment as absent. | Added `started_at` to the database and integrated it into the `runCatchUp` bounds. Dates prior to `started_at` are safely bypassed. |
| **Missing Punch-Outs / Leaving Early Logic**: | Confirmed as **Intended Behavior**. Leaving a row open indefinitely defaults to "Present/Late", and checking out early strictly penalizes the student with a Half Day regardless of start time. |
| **No Input Validation on Settings API**: Fine amounts and durations could be set to negative numbers via direct API calls. | Fixed! Added strict backend validation to both `app/api/admin/student-attendance/settings/route.ts` and `app/api/admin/settings/leave-fines/route.ts` to block negative values. |
