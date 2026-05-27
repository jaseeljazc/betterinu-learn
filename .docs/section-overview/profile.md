# My Profile & Self-Service Section Overview

The My Profile section is a personal self-service hub for logged-in administrators who have their accounts mapped to an employee record, allowing them to view personal data, attendance, and download payslips.

---

## Key Features

### 1. Employee Dashboard
*   **Header Info:** Shows avatar photo, employee code, name, designation, department name, and employment type.
*   **Contact Card:** Email address, phone number, and physical address.
*   **Personal details Card:** Gender, date of birth, and highest qualification.
*   **Employment Details Card:** Department name, designation, base salary, date of joining, and current employment status.

### 2. Interactive Attendance mini-calendar
*   **Visual Calendar Grid:** Displays a mini-calendar representing the active month's attendance records.
*   **Month Selection:** Allows traversing month by month via a calendar selector.
*   **Detailed Status indicators:** Color-coded days indicate marked attendance matching the central ledger styles:
    *   `Present` (green)
    *   `Absent` (red)
    *   `Leave` (amber)
    *   `Half-day` (blue)
    *   `Holiday` (purple)
*   **Statistics Summary Row:** Quick visual cards tallying:
    *   Total Present days
    *   Total Absent days
    *   Total Leaves
    *   Total Half-Days
    *   Total LOP (Loss of Pay) Days
    *   Casual Leaves (CL) Used

### 3. Salary & Payslip Vault
*   **Payslip History Table:** Lists payroll runs for past months that have been disbursed by the HR department.
*   **Inline Payslip Viewer:** Click "View Payslip" to open a clean overlay dialog (`payslip-modal.tsx`) summarizing:
    *   Work days, present days, leaves, absences, and half-days.
    *   Base salary earnings.
    *   Calculated Loss of Pay (LOP) deductions.
    *   Net payable salary.
*   **Download/Print Option:** Simple print control to save payslips as PDF files directly.

### 4. Account Settings
*   **Change Password Dialog:** Fast access to update user account security password directly from the actions menu.
