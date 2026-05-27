# Roles & Permissions (RBAC) Section Overview

The Roles & Permissions section configures the Role-Based Access Control (RBAC) matrix for the admin panel, defining what modules and actions each user role can access.

---

## Key Features

### 1. Role Registry
*   **Predefined Roles:** Displays existing roles (e.g., Super Admin, Academic Coordinator, HR Manager).
*   **Role Management:** Allows creating new custom roles and deleting unneeded roles.

### 2. Permissions Matrix
Creating or editing a role opens a granular grid checklist representing the **9-Module Security System**:
*   **The 9 Core Modules:**
    1.  `students`
    2.  `courses`
    3.  `curriculum`
    4.  `tasks`
    5.  `admins`
    6.  `accounts`
    7.  `employees`
    8.  `payroll`
    9.  `attendance`
*   **Action Verbs:** For each module, admins can toggle checkmarks for specific CRUD actions:
    *   `view` (read access)
    *   `create` (add new records)
    *   `edit` (modify existing records)
    *   `delete` (remove records)
    *   `actions` (extra procedures like voiding, recalculating, or disbursing)
*   **Real-time Permissions Check:** The application gates sidebar links, route accesses, and action buttons in real time based on this configuration.
