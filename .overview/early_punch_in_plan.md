# Early Punch-In Restriction Plan

## Objective
Currently, students can punch in at any time on a working day (e.g., 2:00 AM). We need to restrict punch-ins so that students can only punch in a configurable amount of time *before* the official `work_start_time`. Punch-outs remain unrestricted so students can leave whenever their shift ends.

## Implementation Details

### 1. Update Settings Schema (`src/lib/app-settings.ts`)
We need to add a new property to store this configuration in the database.
- **Add** `early_punch_in_minutes: number;` to the `StudentAttendanceSettings` interface.
- **Update** `DEFAULT_STUDENT_ATTENDANCE_SETTINGS` to include `early_punch_in_minutes: 60` (Default to 1 hour early allowed).

### 2. Update Admin API (`app/api/admin/student-attendance/settings/route.ts`)
When the admin clicks "Save", we need to accept this new setting.
- In the `PUT` handler, safely extract `early_punch_in_minutes` from the request body.
- Fallback to `60` if the value is missing or invalid.
- Make sure it's updated in the database alongside the other settings.

### 3. Add to Settings UI (`app/(admin)/admin/settings/student-attendance/page.tsx`)
We need to give the Admin a text box to change this setting.
- Locate the "Work Hours" card section.
- Add a new Numeric Input field:
  - **Label:** Early Punch-In Window (minutes)
  - **Description:** "How many minutes before the start time can a student punch in? (e.g., 60 means they can punch in 1 hour before their shift starts)."
  - **State Binding:** Bind it to `current.early_punch_in_minutes`.

### 4. Enforce the Rule on Punch-In (`app/api/student/attendance/punch-in/route.ts`)
This is where we actually block the student from punching in too early.
- Locate the section where `startMinutes` and `currentMinutes` are calculated.
- Calculate the threshold: `const earliestAllowedMinutes = startMinutes - settings.early_punch_in_minutes;`
- Add an `if` check: 
  ```typescript
  if (currentMinutes < earliestAllowedMinutes) {
    const earlyH = Math.floor(earliestAllowedMinutes / 60);
    const earlyM = earliestAllowedMinutes % 60;
    const timeStr = `${String(earlyH).padStart(2, "0")}:${String(earlyM).padStart(2, "0")}`;
    return NextResponse.json(
      { error: `Too early! You cannot punch in before ${timeStr}.` }, 
      { status: 403 }
    );
  }
  ```

## Summary of Behavior
If `work_start_time` is **09:00** and `early_punch_in_minutes` is **60**:
- 07:59 AM -> ❌ Blocked: "Too early! You cannot punch in before 08:00."
- 08:00 AM -> ✅ Allowed (Status: Present)
- 09:05 AM -> ✅ Allowed (Status: Present)
- 09:30 AM -> ✅ Allowed (Status: Late)
- Punch-out at any time -> ✅ Allowed.
