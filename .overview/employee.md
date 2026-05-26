Viewed data-table.tsx:197-228

Here is a non-technical overview of the **Employee Module**:

### 1. Employee Directory & Directory Filter
* **Employee List**: A table showing all registered staff members with their Code, Name, Designation, Department, Status, and Employment Type.
* **Smart Filters**: Quick filters allow you to narrow down the view by **Department**, **Employment Type** (Full-Time, Part-Time, Contract), or **Status** (Active, Inactive, On Notice, Resigned).
* **Global Search**: Search bar to filter employees by name.

### 2. Detailed Employee Profile
Clicking on an employee opens a detailed breakdown structured into cards:
* **Contact Information**: Email address, validated phone number, and physical address.
* **Personal Information**: Gender, Date of Birth, and Highest Qualification level.
* **Employment Details**: Department, designation, monthly salary (formatted in ₹), date of joining, and their reporting manager.
* **Admin Access Status**: Shows whether this employee has access to the management console and their specific role.
* **Document Vault**: A secure vault displaying all uploaded files categorized into:
  * **Identity & Banking**: Aadhaar card, PAN card, and Bank passbook.
  * **Educational Certificates**: Diplomas, degrees, PG files (conditioned on their highest qualification).
  * **Other Attachments**: Custom admin-uploaded files (e.g., experience letters).

### 3. Employee Creation & Management Form
* **Avatars & Image Cropper**: Upload profile pictures with a built-in zoomable, draggable cropping utility that formats images into circular previews.
* **Emergency Contact Details**: Option to save the name, relationship, and contact number of a relative.
* **Safe Creation & Uniqueness Checks**: The form verifies phone number formatting and scans the entire system (including database records and authentication registries) to block duplicates before an employee record is added.
* **One-Click Admin Access**: Toggle to automatically grant access to the admin panel, assign permissions, and send a welcome email containing a temporary password.

### 4. Administrative Accounts Panel
* **Admin List**: A dashboard displaying all administrative accounts, their roles (e.g., Admin, Instructor, Support, Account Manager), and status.
* **Password Recovery**: Securely displays **Temporary Passwords** for each admin. If email delivery fails, the admin password is saved here so it can be shared manually.
* **Status Updates**: Allows you to change roles or deactivate administrator logins.




Attendence



### 1. Dashboard Overview
* **Today's Summary**: Quick summary counters show real-time statistics for the current day, including:
  * Total Employees
  * Checked In (Present)
  * Absent
  * On Leave
  * Half-Day Logs
* **Filters**: You can filter the attendance log by **Month** (e.g. `2026-05`) and **Department** to see only the staff members you are interested in.

### 2. Monthly Attendance Grid (Timesheet)
* **Visual Grid**: A grid mapping all employees against each day of the month.
* **Weekend Markers**: Saturdays and Sundays are highlighted to make schedules easy to read.
* **Attendance Indicators**: Each cell displays color-coded indicators showing whether the employee was:
  * **Present** (Green checkmark)
  * **Absent** (Red cross)
  * **On Leave** (Gift/Holiday icon)
  * **Half-Day** (Clock icon)
* **Empty Slots**: Empty cells show days that haven't been marked yet.

### 3. Log / Edit Attendance
* **Log Attendance Dialog**: Clicking on any date cell opens a modal that allows you to:
  * Select the attendance status (Present, Absent, Leave, Half-Day).
  * Add custom notes (e.g., "Doctor's appointment" or "Medical leave").
  * View who marked the attendance.
* **Permission Gated**: Logging and editing are restricted based on user role permissions (e.g., requiring view/create/edit permissions for attendance).

### 4. Payroll Lock Protection
* **Automatic Locking**: Once payroll has been finalized and **disbursed** (paid out) for an employee in a given month, their attendance records for that month are locked.
* **Visual Cue**: Locked days display a lock icon, protecting finalized financial and attendance audit trails from being altered.



# Attendance, Leave & Payroll Calculation Flow

## 1. Working Days & Daily Rate

### Working Days

The system calculates working days by excluding:

* Sundays
* Explicit holidays (manual or auto-designated)

\text{Working Days} = \text{Total Days in Month} - \text{Sundays} - \text{Holidays}

### Daily Rate

The employee’s daily salary rate is calculated using the monthly base salary divided by working days.

\text{Daily Rate} = \left\lfloor \frac{\text{Monthly Base Salary}}{\text{Working Days}} \right\rfloor

---

## 2. Attendance Status Categories

The system tracks the following attendance states for active working days:

| Status   | Description                       |
| -------- | --------------------------------- |
| Present  | Normal full working day           |
| Leave    | Approved leave                    |
| Absent   | Unapproved leave (direct LOP)     |
| Half-Day | Employee worked only half the day |

---

## 3. Leave & Loss of Pay (LOP) Rules

### Monthly Paid Leave Allowance

Each employee receives:

* **1 paid leave per month**

---

### Full-Day Leave Rules

* The **first leave** in a month is considered paid.
* Any additional leaves are treated as Loss of Pay (LOP).

\text{LOP Leaves} = \max(0, \text{Leave Count} - 1)

---

### Absence Rules

All absences are directly counted as LOP.

\text{LOP Absences} = \text{Absent Count}

---

### Half-Day Rules

Half-days are grouped into pairs.

#### Half-Day Pair Calculation

\text{Half-Day Pairs} = \left\lfloor \frac{\text{Half-Day Count}}{2} \right\rfloor

#### Leftover Half-Day Logic

If there is an odd number of half-days:

* If the employee:

  * has **no other full-day leaves**
  * and **no absences**

  then the unused paid leave allowance covers the remaining half-day.

* Otherwise:

  * the leftover half-day counts as **0.5 LOP day**

---

### Total LOP Days

\text{Total LOP Full-Days} = \text{LOP Leaves} + \text{LOP Absences} + \text{Half-Day Pairs}

---

## 4. Payroll Salary Computation

### Loss of Pay (LOP) Deduction

The salary deduction is calculated using total LOP days and the daily rate.

\text{LOP Deduction} = (\text{Total LOP Full-Days} \times \text{Daily Rate}) + (\text{LOP Half-Days} \times \text{Daily Rate})

---

### Net Salary Calculation

Final payable salary after LOP deduction:

\text{Net Salary} = \max(0, \text{Gross Salary} - \text{LOP Deduction})

---

## 5. Automated Payroll Sync & Locking

### Automatic Payroll Synchronization

Whenever attendance is:

* marked
* edited
* unmarked

the system automatically triggers:

`syncExistingPayrollRunFromAttendance()`

This recalculates and updates the payroll data for the corresponding month in real time.

---

### Payroll Disbursal Lock Protection

If a payroll run has already been:

* **Disbursed**
* finalized
* paid out

then:

* attendance modifications are blocked
* payroll recalculation is skipped
* timesheet cells display lock indicators for that month

This prevents accidental modification of finalized payroll records.


sandwich rule


=== RUNNING SANDWICH LEAVE CALCULATION TESTS ===
Case 1 (Mid-Month Saturday/Sunday/Monday Leave):
  - Leave Count: 4
  - Expected: 4 (May 15, May 16, May 17 [Sandwiched Sunday], May 18)
  - Match: PASS
Case 2 (Consecutive Off-Days Sandwich: Fri Leave, Sat Holiday, Sun Weekly Off, Mon Leave):
  - Leave Count: 4
  - Expected: 4 (May 15, May 16 [Sandwiched], May 17 [Sandwiched], May 18)
  - Match: PASS
Case 3 (Month Boundary Sandwich: Jan 31 Leave, Feb 1 Sunday Weekly Off, Feb 2 Leave):
  - Leave Count: 2
  - Expected: 2 (Feb 1 [Sandwiched], Feb 2)
  - Match: PASS
Case 4 (Not Sandwiched: Fri Leave, Sat Present, Sun Weekly Off, Mon Leave):
  - Leave Count: 2
  - Expected: 2 (Fri, Mon)
  - Match: PASS

  (Note: In the payroll calculation, your 1-day monthly paid leave allowance will cover the first day, meaning the resulting loss of pay deduction will be calculated for the remaining 2 days).
=== TESTS COMPLETED ===