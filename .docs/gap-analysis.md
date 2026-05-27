# Gap Analysis — LMS Admin Panel

This document outlines the missing, incomplete, or underdeveloped areas identified across the LMS Admin Panel modules and workflows.

---

# 🔴 Critical Gaps (Functional Holes)

## 1. Student Management

### Missing Features
- No bulk student import functionality (CSV/Excel upload)
  - Registering students individually is not scalable for large institutions.

- No student deactivation/suspension workflow
  - Only deletion is currently available, which removes historical records and affects auditability.

- No password reset mechanism for students
  - Password management exists only for admin accounts.

### Impact
- Poor scalability
- Loss of historical tracking
- Increased admin overhead

---

## 2. Submissions / Grading

### Missing Features
- No bulk approval/rejection actions
  - Reviewing large batches of submissions individually is inefficient.

- No grade/points recording for course assignment approvals
  - Standalone tasks support points, but course assignments currently lack scoring support.

- No resubmission limit configuration
  - Students can potentially submit unlimited attempts after rejection.

### Impact
- Slower grading workflows
- Inconsistent academic evaluation
- Potential abuse of submission system

---

## 3. Financial Accounts

### Missing Features
- No recurring transaction support
  - Examples:
    - Monthly rent
    - Staff salaries
    - Subscription payments

- No budget or expense limit alerts
  - Overspending is not automatically flagged.

- No export functionality
  - Missing:
    - CSV export
    - PDF export
    - Printable reports

### Impact
- Manual repetitive bookkeeping
- Lack of financial control mechanisms
- Difficult reporting and auditing

---

## 4. Courses & Curriculum

### Missing Features
- No publish/draft workflow for courses
  - Only active/inactive states are available.

- No prerequisite chaining
  - Courses cannot require completion of another course beforehand.

- No lesson/content versioning
  - Content edits overwrite existing data without revision history.

### Impact
- Weak curriculum management
- No staged publishing process
- Loss of historical content changes

---

# 🟡 Significant Gaps (UX / Workflow Completeness)

## 1. Attendance Management

### Current Situation
An interactive monthly timesheet grid is implemented allowing admins to log daily attendance statuses (`Present`, `Absent`, `Leave`, `Half_Day`, `Holiday`) for employees, with Sundays marked automatically. Disbursed payroll runs lock the corresponding month's attendance records to preserve audit trails.

### Missing Features
- **No Biometric / Bulk Import Support:** Attendance must be marked manually cell-by-cell; there is no CSV upload or API for biometric clock-in machines.
- **No Leave Request / Approval Workflow:** Employees cannot request leaves online; admins must manually mark days as "Leave" in the system.
- **No Holiday Calendar Planner:** Holidays must be manually marked on the grid; there is no global calendar to configure holidays in advance.
- **No Shift / Timestamp Tracking:** Calculates day-level status only; does not log actual check-in/check-out times or shifts.
- **No Export Options:** Timesheet grid is visual-only and lacks PDF or Excel report exporting.

### Impact
- High admin overhead for institutions with large staff counts.
- Lack of self-service workflows for employee leaves.

---

## 2. Payroll Management

### Current Situation
A complete monthly payroll processing system is implemented. It includes a calculation engine that integrates attendance metrics (leaves, absences, half-days) and enforces sandwich leave rules. Authorized admins can run draft calculations, update status configurations, choose disbursement accounts, log expense ledger entries under the `"Salaries"` category, and view itemized PDF-printable payslips.

### Missing Features
- **No Complex Salary Structures:** Supports only a single flat monthly base salary; there is no granular breakdown for HRA, allowances, bonuses, or custom earnings.
- **No Statutory Tax/Deductions:** Does not compute tax deductions (TDS), provident fund (PF), professional tax (PT), or ESIC.
- **No Direct Bank Integration:** Disbursement marks records as paid and adjusts ledger accounts, but does not execute direct bank transfers (requires manual bank uploads or offline payments).
- **No Retrospective Corrections:** No workflow for correcting attendance errors once a payroll month is marked as disbursed (locked).

### Impact
- Limited compliance with statutory labor laws and income tax filing.
- Administrative effort required to process bank payout files offline.

---

## 3. Notifications System

### Missing Features
No notification or alert system is documented.

### Expected Notification Scenarios
- Submission approved/rejected
- New assignment submission received
- Payroll processed
- Leave request updates
- Course publishing updates
- Financial alerts

### Possible Notification Channels
- In-app notifications
- Email alerts
- Push notifications
- SMS integrations

### Impact
- Weak user engagement
- Delayed operational awareness

---

## 4. Roles & Permissions

### Missing Features
- No audit log for role/permission changes
  - No tracking of:
    - Who changed permissions
    - What was changed
    - When it was changed

- Actions verb mapping is vague
  - Module-level permissions are not clearly documented.

### Impact
- Reduced security transparency
- Difficult permission debugging

---

# 🟢 Minor Gaps (Polish / Edge Cases)

| Area | Missing Feature |
|---|---|
| Admin Management | No 2FA / MFA authentication support |
| Course Catalog | No student-facing course preview/description page |
| Financial Dashboard | No multi-currency or fiscal-year configuration |
| Standalone Tasks | No due date/deadline field |
| Submissions | No plagiarism/duplicate submission detection hook |
| Profile Management | No employee document vault (ID proof, certificates, contracts) |
| Dashboard | No customizable widgets or date-range filtering on metrics |

---

# Summary

The LMS Admin Panel already covers several core workflows, but the following areas require significant enhancement for production readiness:

## Highest Priority Areas
1. Attendance Management
2. Payroll Management
3. Notifications System
4. Student Lifecycle Management
5. Scalable Submission Review Workflows

## Recommended Next Steps
- Introduce missing foundational HR modules
- Add workflow automation and notifications
- Improve scalability features (bulk actions/imports)
- Strengthen auditability and historical tracking
- Expand financial and academic reporting capabilities

---