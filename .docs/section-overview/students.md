# Student Management Section Overview

The Student Management section enables administrators to register, manage, and monitor students, tracking their learning progress, assigning courses, and grading their tasks.

---

## Key Features

### 1. Student Directory
*   **Directory Listing:** Displays a grid/table of registered students with their name, email, code, and date of enrollment.
*   **Registration Form:** Allows adding a new student record (Name, Email, Password, Date of Birth, Gender, Address, Phone Number).
*   **Permissions Gate:** Directory viewing, editing, and deletion are governed by the `students` module permissions.

### 2. Student Details Page
Clicking a student opens their comprehensive profile view, split into three tabs:

#### A. Courses Tab
*   **Enrollment History:** Displays all courses assigned to the student.
*   **Course Progress Bar:** Visual progress tracking showing the exact percentage of completed sub-modules/lessons.
*   **Curriculum Accordion:** Expanding a course reveals its weekly and daily breakdown:
    *   Lists lessons, tasks, and assignments.
    *   Tracks completed status with checkmarks.
*   **Course Assignments Stat Row:** Quick summary count of total submissions, approved assignments, and pending reviews.

#### B. Submissions Tab (Course Assignments)
*   **Submission History:** Displays all course-based assignments submitted by the student.
*   **Inline Review:** Allows admins to read submitted text directly inside an expandable note.
*   **Review Panel:** Admins can:
    *   Change submission status (Approve or Reject/Revise).
    *   Attach text feedback/notes explaining revisions.
*   **Audit Trail:** Displays submission and review timestamps.

#### C. Tasks Tab (Standalone Assignments)
*   **Standalone Submissions:** Tracks submissions for standalone assignments (non-course-bound tasks) assigned directly to the student.
*   **Review Actions:** Fast redirect to the central standalone review page.

### 3. Action Sidebar (Admins Only)
*   **Assign Course:** A combobox dropdown allowing the admin to assign any active course that the student is not currently enrolled in.
*   **Assign Task:** A combobox dropdown allowing the admin to assign a standalone assignment (common or course-specific) to the student.
*   **Quick Statistics:** Displays total courses, approved assignments, pending reviews, revisions needed, and overall syllabus progress.
