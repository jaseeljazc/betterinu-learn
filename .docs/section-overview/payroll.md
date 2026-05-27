# Payroll Management & Disbursement Section Overview

The Payroll Management section provides a comprehensive administrative interface and calculation engine for generating monthly employee salaries, integrating attendance logs, applying automatic deductions (Loss of Pay), and executing organization-level disbursements into the financial ledger.

---

## Key Features

### 1. Payroll Dashboard & Month Navigation
*   **Monthly Cycles:** View and execute payroll for specific calendar months (formatted as `YYYY-MM`) with intuitive left/right navigation controls.
*   **Organizational Metrics:** Summarizes the overall financial obligations for the active month:
    *   **Total Gross:** Sum of base salaries for all active employees.
    *   **LOP Deductions:** Total Loss of Pay deductions calculated from absences and leaves.
    *   **Net Payable:** Total net disbursement amount needed to settle the month's payroll.
*   **Employee Payroll Registry:** A tabular list displaying each employee's code, designation, department, monthly attendance statistics, count of LOP days, gross salary, total deductions, net payable salary, and current processing status.

### 2. Automatic Payroll Calculation Engine
The system processes attendance data for each employee to calculate payroll parameters:
*   **Working Days (WD):** Evaluated as the number of days in the month excluding Sundays and public holidays (unless the employee explicitly worked on those days).
*   **Daily Rate:** Calculated as:
    $$\text{Daily Rate} = \left\lfloor \frac{\text{Monthly Base Salary}}{\text{Working Days}} \right\rfloor$$
*   **Leave and Absence Deductions:**
    *   **Leaves:** Each employee is entitled to **1 paid leave per month**. Any additional full-day leaves are treated as Loss of Pay (LOP):
        $$\text{LOP Leaves} = \max(0, \text{Leave Count} - 1)$$
    *   **Absences:** Any unexcused absence is directly treated as LOP:
        $$\text{LOP Absences} = \text{Absent Count}$$
    *   **Half-Days:** Half-days are paired together. Every two half-days count as 1 full LOP day:
        $$\text{Half-Day Pairs} = \left\lfloor \frac{\text{Half-Day Count}}{2} \right\rfloor$$
        A remaining/leftover single half-day (`Half-Day Count % 2 == 1`) is covered by the unused monthly paid leave allowance if the employee has no other full-day leaves or absences. Otherwise, it counts as 0.5 LOP days.
*   **Total LOP Deduction:**
    $$\text{LOP Deduction} = (\text{Total LOP Full Days} \times \text{Daily Rate}) + (\text{LOP Half Days} \times \text{Daily Rate})$$
*   **Net Salary:**
    $$\text{Net Salary} = \max(0, \text{Gross Salary} - \text{LOP Deduction})$$

### 3. The Sandwich Leave Rule
To prevent employees from taking leaves adjacent to holidays or weekends to artificially extend their time off without LOP, the system enforces a strict sandwich rule:
*   **Consecutive Block Evaluation:** If there is a continuous block of **3 or more consecutive days** containing a combination of employee leave days and public holidays/weekly offs (Sundays), and the block starts or ends with a leave day (meaning it is connected directly by leaves without present/working days in between), then **all days within that block are counted as leave**.
*   **Month Boundary Buffer:** Calculations fetch attendance logs with a **7-day buffer window** before and after the active month boundary. This ensures sandwich leave blocks that span across months (e.g. from the end of April into early May) are calculated accurately.

### 4. Payroll Generation & Real-Time Sync
*   **Run Payroll Trigger:** Initiates the generation of payroll runs for all active employees for the selected month.
*   **State Machine Lifecycle:** Tracks each payroll run through the following statuses:
    *   `Draft`: Newly generated run, open to automated synchronization.
    *   `Approved`: Confirmed by an administrator, ready for disbursement.
    *   `On Hold`: Temporarily frozen or suspended from disbursement.
    *   `Disbursed`: Paid out, finalized, and locked.
*   **Real-Time Synchronization:** Whenever attendance is logged, modified, or cleared, the system automatically triggers an attendance-payroll sync (`syncExistingPayrollRunFromAttendance`) to recalculate LOP and net salary in real time for any run still in `Draft`, `Approved`, or `On Hold` status.

### 5. Disbursement & Ledger Integration
*   **Account Selection:** Admins can select an active Cash, Bank, or Digital Wallet account to process payroll disbursements.
*   **Double-Entry Expense Logging:** When salaries are disbursed:
    1.  The chosen financial account is debited by the employee's `net_salary`.
    2.  An expense transaction is logged in the `account_transactions` table under the **"Salaries"** system category.
    3.  The payroll run status shifts to `Disbursed` with a stamped payment timestamp (`disbursed_at`) and transaction reference.
*   **Audit Lock Protection:** Once a payroll run is marked as `Disbursed`, it becomes completely read-only. Further attendance modifications for that employee during that month are strictly blocked, preventing retrospective alterations to financial or attendance records.

### 6. Payslip Vault
*   **Detailed Payslip Rendering:** Both administrators and individual employees (via their profile) can view detailed payslips in a modal showing:
    *   **Employee Information:** Name, code, department, designation, and joining date.
    *   **Attendance Summary:** Work days, present days, leaves, absences, and half-days.
    *   **Earnings:** Basic salary.
    *   **Deductions Itemization:** Line items explaining LOP deductions (absences, excess leaves, half-days).
    *   **Net Payable Summary:** The final paid salary amount along with the disbursement date.
*   **PDF Generation:** The payslip modal provides a print-optimized stylesheet, allowing one-click download or printing of the payslip.
