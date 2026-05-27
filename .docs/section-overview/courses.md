# Courses & Curriculum Section Overview

The Courses & Curriculum section handles the authoring and organization of learning materials. It features a advanced course catalog and an interactive three-panel builder to structure syllabus content.

---

## Key Features

### 1. Course Catalog
*   **Active Directory:** Displays active courses with details on difficulty level, estimated duration, and description.
*   **Course Management:** Allows creating new courses, modifying basic metadata, uploading cover images, and deleting courses (gated by `courses` module permissions).

### 2. Three-Panel Curriculum Builder
Inside a course, clicking the **Curriculum** tab opens the unified course builder.

#### A. Left Panel: Syllabus Structure (Outline)
*   **Weeks & Days:** Organizes the course into logical containers (e.g., Week 1, Day 1).
*   **Drag & Drop Sorting:** Allows re-ordering weeks and days with real-time updates.
*   **Interactive Node Navigation:** Clicking on any Day displays its content in the middle panel.

#### B. Middle Panel: Day Content (Modules)
*   **Module Block Types:** Lists all modules within the selected day. Modules can be:
    *   **Lessons:** Instructional reading material.
    *   **Assignments:** Practical tasks with submission criteria.
    *   **Quizzes:** Knowledge checks.
*   **Add & Sort Controls:** Allows adding new modules and re-arranging them.

#### C. Right Panel: Content Editors (Drawer/Workspace)
Selecting a module in the middle panel opens its dedicated editor in the right drawer:
*   **Lesson Markdown Editor:** A rich text/markdown editor (`lesson-section-editor.tsx`) to compose formatted course pages, tables, code snippets, and media embeds.
*   **Quiz Builder:** Add, edit, and delete multiple-choice questions, mark correct answers, and define scoring criteria.
*   **Assignment Editor:** Formulate task descriptions, submission format requirements (text, file uploads, URLs), and point values.
