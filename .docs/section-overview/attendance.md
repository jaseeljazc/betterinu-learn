# Attendance Management Section Overview

The Attendance Management section provides an interactive, Excel-style timesheet interface for logging daily employee attendance, tracking monthly summary metrics, managing leave categories, and ensuring ledger audit integrity through integration with the payroll system.

---

## Key Features

### 1. Daily Summary Counters
*   **Today's Counters:** Displays real-time counts of employees based on their daily status:
    *   **Present:** Worked the full day (Green badge).
    *   **Absent:** Missed work without leave (Red badge).
    *   **Leave:** Approved leave day (Amber badge).
    *   **Half-Day:** Worked a half-day shift (Blue badge).
    *   **Holiday:** Scheduled holiday (Purple badge).
*   **Contextual Timing:** Showcases the current date and automatically updates counts in real time as daily attendance is logged.

### 2. Interactive Monthly Timesheet Grid
*   **Complete Overview:** Maps all active employees against every day of the selected month in a responsive, scrollable grid view.
*   **Visual Schedule Markers:**
    *   **Sundays:** Automatically labeled and highlighted to represent standard weekly off days.
    *   **Status Codes:** Quick color-coded initials representing the daily status of each marked day (`P`, `A`, `L`, `HD`, `H`).
    *   **Unmarked Slots:** Empty slots represent days for which attendance has not yet been processed.
*   **Custom Filtering:** Easily switch between calendar months and filter the employee list by department.

### 3. Quick Marking & Audit Logging
*   **Cell Selection Popover:** Clicking on any cell opens a modal that allows admins to:
    *   Log or update the employee's status (`Present`, `Absent`, `Leave`, `Half_Day`, `Holiday`).
    *   Write contextual notes (e.g., medical reasons, travel notes).
    *   View audit details showing who originally marked or last modified the day's record.
*   **Permission Gated:** Logging and modifying operations require explicit attendance marking permissions.

### 4. Payroll Lock Protection
*   **Auditable Ledger Safeguards:** Once a payroll run is finalized and disbursed for an employee in a given month, all attendance cells for that employee during that month are automatically locked.
*   **Visual Cues:** Locked cells display a secure lock icon, blocking clicks or updates to preserve financial calculations.
