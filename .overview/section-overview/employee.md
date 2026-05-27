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

---

## Related Modules
For details regarding attendance tracking and salary processing, see:
* [Attendance Management](file:///c:/Users/jasee/OneDrive/Desktop/d3%20projects/lms/my-app/.docs/section-overview/attendance.md)
* [Payroll Management & Disbursement](file:///c:/Users/jasee/OneDrive/Desktop/d3%20projects/lms/my-app/.docs/section-overview/payroll.md)
