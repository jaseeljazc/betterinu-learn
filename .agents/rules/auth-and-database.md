---
trigger: always_on
---

# Database & Auth

## Schemas (canonical)

| Schema      | Purpose                                                              |
| ----------- | -------------------------------------------------------------------- |
| `core`      | Roles, permissions, role_permissions, list-of-value categories/values |
| `hr`        | Substantive employee record (name, email, role_id, …)                |
| `users`     | Firebase-UID ↔ `hr.employees` / student mapping                      |
| `learning`  | Courses → modules → content / tasks → enrollments → progress / reviews |
| `academics` | External / domain schemas referenced by FKs                          |

The identity chain for a logged-in employee is:

```
Firebase Auth user (UID)
  ↓
users.employees (auth_id = UID, employee_id → hr.employees.id)
  ↓
hr.employees (role_id → core.roles.id, is_active)
  ↓
core.role_permissions (role_id × permission_id)
  ↓
core.permissions (module, action) — what the user can DO
```

Anywhere the server needs to know "who is this and what can they do", it
joins these five tables and caches the result for the request.

## SQL DDL (`scripts/create/<schema>/NNN_*.sql`)

Postgres is the target (Neon in production). Files run in order, grouped by
schema folder (`auth/`, `core/`, `learning/`, …).

### Required header

Every file starts with the banner used across the codebase:

```sql
-- ============================================================
-- 003_content_items.sql
-- Schema: learning
-- Table: learning.content_items
-- <one-line purpose>
-- Dependencies: learning.modules, users.employees
-- ============================================================
```

### Conventions

- Always wrap creation in `CREATE SCHEMA IF NOT EXISTS <schema>;` and
  `CREATE TABLE IF NOT EXISTS <schema>.<table> ( … )`.
- Identifiers are `snake_case`; table names are plural; schemas are lowercase
  nouns (`core`, `users`, `learning`).
- Primary keys: `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`.
- Audit columns on every long-lived table:
  ```sql
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  ```
- Constraint naming: `uq_<table>_<cols>`, `fk_<table>_<ref>`,
  `chk_<table>_<purpose>`, `pk_<table>` (only when overriding the default).
- Foreign keys are explicit `CONSTRAINT fk_… FOREIGN KEY (col) REFERENCES
  <schema>.<table>(col)`. Pick `ON DELETE CASCADE` for parent-child within the
  same domain (`courses → modules → content_items`), `ON DELETE RESTRICT` when
  history must survive (`enrollments → courses`).
- `CHECK` constraints encode enums in lieu of separate enum types (see
  `learning.tasks.submission_type`, `learning.task_submissions.status`).
- Add `COMMENT ON TABLE` / `COMMENT ON COLUMN` for every table and column —
  these are the API docs for the schema.
- Seed inserts MUST be idempotent: `INSERT … ON CONFLICT … DO NOTHING`.
- Add indexes for common access paths, especially partial indexes on
  workflow states (e.g.
  `WHERE status = 'pending'` on `learning.task_submissions`).

## Learning Domain (state machine)

```
enrollment → student_module_progress (one row per module, status FSM):
  locked → unlocked → in_progress → submitted → approved
                                          ↘ rework → submitted (resubmit)
```

- The first module is auto-unlocked on enrollment; every subsequent module
  flips from `locked` to `unlocked` only after the previous module's
  `student_module_progress.status = 'approved'`.
- A `module_review` row is written for **every** review pass (approve OR
  rework) so the audit trail is complete.
- A new `task_submissions` row is written for every attempt;
  `attempt_no` increments on rework. The "current" submission is the row with
  the highest `attempt_no` for a `(task_id, student_id)` pair.

### Weeks, Modules & Submodules (`learning.weeks` + `learning.modules`)

- A course is shaped as **course → optional weeks → modules → submodules**.
  - `learning.weeks` is an optional named container (`(course_id, sort_order)`
    UNIQUE). A course with no weeks places its modules directly under itself.
  - `learning.modules.week_id` (FK, `ON DELETE SET NULL`) groups modules
    inside a week. Deleting a week detaches its modules instead of deleting
    them — they fall back into the "no week" bucket.
  - `learning.modules.parent_module_id` (FK, `ON DELETE CASCADE`) implements
    submodules. A submodule inherits its `course_id` from its parent and
    its `week_id` is forced to match the parent's at create time.
- `sort_order` is **scoped to siblings** — modules sharing the same
  `(course_id, week_id, parent_module_id)` triple — and is enforced at the
  application layer (no DB UNIQUE; see `004_modules_extend.sql` which dropped
  the legacy one). Reorder via `moveModule` is a single transactional swap.
- `is_published` is the visibility gate. Drafts (modules **and** weeks) are
  invisible to students regardless of their per-module unlock state.
- Read helpers:
  - `lib/data/course-tree.ts:getCourseTree(courseId)` — full
    weeks/modules/submodules tree with block + task counts. Used by the
    builder, the course detail page, and the student renderer.
  - `lib/data/modules.ts`, `lib/data/weeks.ts` for narrower lookups.
- Mutations:
  - `lib/actions/weeks.ts` (`createWeek`, `updateWeek`, `deleteWeek`,
    `moveWeek`, `toggleWeekPublished`) gated by `weeks.<verb>`.
  - `lib/actions/modules.ts` (`createModule`, `updateModule`, `deleteModule`,
    `moveModule`, `toggleModulePublished`, `reparentModule`) gated by
    `modules.<verb>`.
- The course builder lives at `app/admin/(home)/courses/[courseId]/builder/`
  with the outline tree on the left and a per-module editor (or preview)
  on the right. The standalone module CRUD pages are deliberately gone —
  module authoring only happens inside the builder.

### Content Blocks (`learning.content_blocks`)

- Page-builder primitives composing a module body. `block_type` is one of
  `heading | paragraph | image | video | link | article | columns |
  divider | callout | embed | code | quote | list`. The per-type payload
  shape lives in `lib/content-blocks/types.ts`.
- `data` is JSONB. **Do not** add new columns for type-specific fields —
  put them inside `data` and update the discriminated union.
- `parent_block_id` + `column_index` model the Columns layout: a `columns`
  block has children whose `column_index` slots them into 0..N-1. Columns
  cannot nest inside columns; the action enforces this.
- `sort_order` is scoped to `(module_id, parent_block_id, column_index)`.
- Read: `lib/data/content-blocks.ts:listBlocksByModule(moduleId)`.
- Mutate: `lib/actions/content-blocks.ts` (`createBlock`, `updateBlock`,
  `deleteBlock`, `moveBlock`, `moveBlockToColumn`) gated by
  `content_blocks.<verb>`.
- Rendering goes through `components/builder/block-renderer.tsx` — the same
  component that renders preview *and* the student-facing module page.
  This guarantees parity between author and learner views.

### Tasks, Submissions & Reviews

- `learning.tasks` carries `submission_type` ∈ `text | link | file | image
  | mixed`, `max_files`, and `is_required`. Required tasks gate module
  approval.
- `learning.task_submissions` stores one row per attempt. `submission_files`
  is a JSONB array of `{ url, name, contentType }`. The "current" attempt
  is the row with the highest `attempt_no` for a `(task_id, student_id)`.
- Student-facing helpers: `lib/data/student-learning.ts` (course tree with
  per-module status overlay; `getStudentModuleDetail` for the module page).
  The first time a student opens a course, missing
  `student_module_progress` rows are seeded lazily — the first top-level
  module is auto-`unlocked`, the rest start `locked`.
- `lib/actions/submissions.ts:submitTask` validates the active session,
  uploads files via `uploadSubmission` (broader allowed-types set than the
  image-only `uploadImage`), inserts the attempt, and bumps the module's
  progress to `submitted`.
- `lib/actions/reviews.ts:reviewTaskSubmission` is the reviewer entrypoint.
  Approving a submission walks the module's required tasks and, when all
  are approved, promotes the module (`approved`) and unlocks the next
  sibling. `unlockModuleManually` is the override for special cases.
- Permissions surface area: `tasks.*`, `submissions.*`, `reviews.*`,
  `weeks.*`, `content_blocks.*`. Sync via
  `scripts/insert/002_sync_admin_permissions.sql` after adding entries.

## Prisma (`lib/db.ts` + `prisma/schema.prisma` + `prisma.config.ts`)

- Always import the singleton: `import { prisma } from "@/lib/db"`. Never
  `new PrismaClient()` elsewhere — it breaks the dev hot-reload guard.
- The client is generated to `@/generated/prisma/client` and uses
  `@prisma/adapter-pg` against `DATABASE_URL` (which **must** include
  `?sslmode=require` for Neon — the `pg` driver does not negotiate TLS
  automatically).
- Prisma 7 split the connection URL out of the schema. `prisma.config.ts`
  loads `dotenv/config` and exposes `datasource.url = process.env.DATABASE_URL`.
  Don't put `url = env(…)` inside `schema.prisma` — it's an error in 7.x.
- Models are **introspected** from the SQL DDL via `pnpm prisma db pull`.
  After any DDL change, the workflow is:
  1. Apply the new SQL via `psql "$DATABASE_URL" -f scripts/create/.../NN_*.sql`
  2. `pnpm prisma db pull` to refresh `schema.prisma`
  3. `pnpm prisma generate` to rebuild the client
  Do not hand-edit model bodies in `schema.prisma`; SQL is the source of truth.
- Multi-schema is enabled via `datasource.schemas = ["auth","core","hr","users",…]`.
  Add new schemas to that list before re-introspecting.
- Generated naming is exact-table-name (e.g. `users_employees` for
  `users.employees`, `hr_employees` for `hr.employees`). Use those identifiers
  when calling Prisma — don't rename them in the schema file (they get
  regenerated on next pull).
- `next.config.mjs` lists `@prisma/client`, `@prisma/adapter-pg`,
  `@prisma/client-runtime-utils`, `@prisma/engines`, and `firebase-admin` in
  `serverExternalPackages` so Turbopack does not try to bundle their large
  generated runtimes.

## Firebase Auth

### Server (`lib/auth/firebase-admin.ts`)

- Read credentials only from `process.env.FIREBASE_PROJECT_ID`,
  `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` (with `\n` escapes
  normalised). Throw a descriptive error if any are missing.
- Use the lazy `getAdminAuth()` / `adminAuth` proxy. Never call
  `initializeApp` inline in route handlers.
- This file is **server-only** — never import it from client components.

### Client (`lib/auth/firebase-client.ts`)

- Reads only `NEXT_PUBLIC_FIREBASE_*` env vars (the rest stay server-side).
- `getApps().length === 0 ? initializeApp(…) : getApps()[0]` to avoid HMR
  double-init.

### Session helpers (`lib/auth/session.ts`)

- All authenticated server code resolves the current user via
  `getCurrentEmployee()` from `@/lib/auth/session`. It:
  1. Reads the `__session` HttpOnly cookie
  2. Calls `adminAuth.verifySessionCookie(cookie, /* checkRevoked */ true)`
  3. Joins `users.employees → hr.employees → core.roles → role_permissions →
     permissions` via Prisma
  4. Returns a fully-serialised `CurrentEmployee` object **or `null`** if any
     check fails (no session, revoked, deactivated, missing mapping)
- Use `hasPermission(currentEmployee, "students", "create")` for fine-grained
  checks at the page or action level. Never fall back to "admin can do
  anything" implicit logic — the `core.role_permissions` matrix is the source
  of truth.
- The session cookie is minted by `mintSessionCookie(idToken)` and stored via
  `setSessionCookie(value)`. Logout calls `clearSessionCookie()`. Never write
  the cookie ad-hoc from a route handler — go through these helpers so the
  HttpOnly / SameSite / `__session` invariants stay consistent.

### Sign-in flow

- `app/admin/auth/login/page.tsx` is a **client component**. It calls Firebase
  JS 