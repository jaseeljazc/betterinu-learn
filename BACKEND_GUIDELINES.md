# Backend Development Guidelines

This document outlines the strict rules, conventions, and best practices for backend development in this project. The backend is built using **Next.js App Router**, **TypeScript**, **Prisma (with `@prisma/adapter-pg`)**, **Neon (Serverless PostgreSQL)**, **Firebase Auth**, and **Azure Blob Storage**.

---

## 1. Architecture & Identity Chain

The canonical schema structure and identity chain for a logged-in employee is the source of truth for all authorization:

| Schema      | Purpose                                                              |
| ----------- | -------------------------------------------------------------------- |
| `core`      | Roles, permissions, role_permissions, list-of-value categories/values|
| `hr`        | Substantive employee record (name, email, role_id, is_active, etc.)  |
| `users`     | Firebase-UID ↔ `hr.employees` / student mapping                      |
| `learning`  | Courses → modules → content / tasks → enrollments → progress/reviews |
| `academics` | External / domain schemas referenced by FKs                          |

**Identity Resolution Chain:**
```text
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
Anywhere the server needs to know "who is this and what can they do", it joins these tables and caches the result for the request via `getCurrentEmployee()`.

---

## 2. Database & SQL DDL Conventions

Postgres (Neon) is the target. Files run in order, grouped by schema folder (`scripts/create/<schema>/NNN_*.sql`).

### SQL DDL Rules
- **Required Header**: Every file must start with:
  ```sql
  -- ============================================================
  -- 003_content_items.sql
  -- Schema: learning
  -- Table: learning.content_items
  -- <one-line purpose>
  -- Dependencies: learning.modules, users.employees
  -- ============================================================
  ```
- **Schemas & Tables**: Always wrap creation in `CREATE SCHEMA IF NOT EXISTS <schema>;` and `CREATE TABLE IF NOT EXISTS <schema>.<table> ( … )`. Identifiers are `snake_case`; table names are plural; schemas are lowercase nouns.
- **Primary Keys**: `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`.
- **Audit Columns**: Every long-lived table must have:
  ```sql
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  ```
- **Constraint Naming**: `uq_<table>_<cols>`, `fk_<table>_<ref>`, `chk_<table>_<purpose>`, `pk_<table>`.
- **Foreign Keys**: Explicit `CONSTRAINT fk_… FOREIGN KEY (col) REFERENCES <schema>.<table>(col)`. Use `ON DELETE CASCADE` for parent-child within the same domain, `ON DELETE RESTRICT` when history must survive.
- **CHECK Constraints**: Encode enums in lieu of separate enum types (e.g., `submission_type`, `status`).
- **Comments**: Add `COMMENT ON TABLE` / `COMMENT ON COLUMN` for every table and column. These are the API docs for the schema.
- **Seed Inserts**: MUST be idempotent: `INSERT … ON CONFLICT … DO NOTHING`.
- **Indexes**: Add indexes for common access paths, especially partial indexes on workflow states (e.g., `WHERE status = 'pending'`).

### Prisma Workflow
- **Singleton**: Always import the singleton: `import { prisma } from "@/lib/db"`. Never `new PrismaClient()` elsewhere.
- **Adapter**: Uses `@prisma/adapter-pg` against `DATABASE_URL` (which **must** include `?sslmode=require` for Neon).
- **Config**: `prisma.config.ts` loads `dotenv/config` and exposes `datasource.url = process.env.DATABASE_URL`. Do not put `url = env(…)` inside `schema.prisma`.
- **Introspection**: Models are introspected from SQL DDL via `pnpm prisma db pull`. 
  **Workflow for DDL changes:**
  1. Apply new SQL: `psql "$DATABASE_URL" -f scripts/create/.../NN_*.sql`
  2. Refresh schema: `pnpm prisma db pull`
  3. Rebuild client: `pnpm prisma generate`
  *Do not hand-edit model bodies in `schema.prisma`; SQL is the source of truth.*
- **Multi-schema**: Enabled via `datasource.schemas = ["auth","core","hr","users",…]`. Add new schemas to this list before re-introspecting.
- **Naming**: Generated naming is exact-table-name (e.g., `users_employees` for `users.employees`). Use those identifiers when calling Prisma.
- **Turbopack**: `next.config.ts` must list `@prisma/client`, `@prisma/adapter-pg`, `@prisma/client-runtime-utils`, `@prisma/engines`, and `firebase-admin` in `serverExternalPackages`.

---

## 3. Learning Domain Architecture

### State Machine
```text
enrollment → student_module_progress (one row per module, status FSM):
  locked → unlocked → in_progress → submitted → approved
                                          ↘ rework → submitted (resubmit)
```
- The first module is auto-unlocked on enrollment; subsequent modules flip from `locked` to `unlocked` only after the previous module's `status = 'approved'`.
- A `module_review` row is written for **every** review pass (approve OR rework) for a complete audit trail.
- A new `task_submissions` row is written for every attempt; `attempt_no` increments on rework. The "current" submission is the row with the highest `attempt_no` for a `(task_id, student_id)` pair.

### Weeks, Modules & Submodules
- Structure: **course → optional weeks → modules → submodules**.
- `learning.weeks` is an optional named container. Deleting a week detaches its modules (`ON DELETE SET NULL`), falling back into the "no week" bucket.
- `learning.modules.parent_module_id` (`ON DELETE CASCADE`) implements submodules. A submodule inherits its `course_id` from its parent, and its `week_id` is forced to match the parent's at create time.
- `sort_order` is scoped to siblings `(course_id, week_id, parent_module_id)` and enforced at the application layer (no DB UNIQUE). Reorder via `moveModule` is a single transactional swap.
- `is_published` is the visibility gate. Drafts are invisible to students regardless of unlock state.

### Content Blocks
- Page-builder primitives composing a module body. `block_type` ∈ `heading | paragraph | image | video | link | article | columns | divider | callout | embed | code | quote | list`.
- `data` is JSONB. **Do not** add new columns for type-specific fields; put them inside `data` and update the discriminated union in `lib/content-blocks/types.ts`.
- `parent_block_id` + `column_index` model the Columns layout. Columns cannot nest inside columns.
- `sort_order` is scoped to `(module_id, parent_block_id, column_index)`.

### Tasks, Submissions & Reviews
- `learning.tasks` carries `submission_type` ∈ `text | link | file | image | mixed`, `max_files`, and `is_required`. Required tasks gate module approval.
- `learning.task_submissions` stores one row per attempt. `submission_files` is a JSONB array of `{ url, name, contentType }`.
- `submitTask` validates the active session, uploads files, inserts the attempt, and bumps the module's progress to `submitted`.
- `reviewTaskSubmission` is the reviewer entrypoint. Approving a submission walks the module's required tasks and, when all are approved, promotes the module and unlocks the next sibling.

---

## 4. Authentication & Authorization

### Firebase Auth
- **Server (`lib/auth/firebase-admin.ts`)**: Read credentials only from `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` (with `\n` escapes normalised). Use the lazy `getAdminAuth()` / `adminAuth` proxy. Never call `initializeApp` inline in route handlers. **Server-only**.
- **Client (`lib/auth/firebase-client.ts`)**: Reads only `NEXT_PUBLIC_FIREBASE_*` env vars. Use `getApps().length === 0 ? initializeApp(…) : getApps()[0]` to avoid HMR double-init.

### Session Helpers
- All authenticated server code resolves the current user via `getCurrentEmployee()` from `@/lib/auth/session`. It:
  1. Reads the `__session` HttpOnly cookie.
  2. Calls `adminAuth.verifySessionCookie(cookie, true)`.
  3. Joins the identity chain via Prisma.
  4. Returns a fully-serialised `CurrentEmployee` object **or `null`** if any check fails.
- Use `hasPermission(currentEmployee, "module", "action")` for fine-grained checks. Never fall back to "admin can do anything" implicit logic.
- Session cookies are minted by `mintSessionCookie(idToken)` and stored via `setSessionCookie(value)`. Logout calls `clearSessionCookie()`. Never write the cookie ad-hoc.

### Sign-in Flow
- `app/admin/auth/login/page.tsx` is a client component. It calls Firebase JS SDK `signInWithEmailAndPassword`, then `POST`s `{ idToken }` to `/api/auth/session`.
- `/api/auth/session` is the only place sessions are created (`POST` mints, `DELETE` clears). It verifies the token and confirms the UID maps to an active row in `users.employees`.
- `app/admin/(home)/layout.tsx` is the hard guard: a Server Component that calls `getCurrentEmployee()` and redirects to `/auth/login` if `null`.
- **No student sign-up**: Student accounts are created by employees. Do not add a sign-up route under `app/student/auth/`.
- Sign-out calls `firebase.auth().signOut()` client-side **and** `DELETE /api/auth/session`.

### Bootstrapping the First Admin
There is no public sign-up. The first admin is created out-of-band by running `scripts/insert/001_bootstrap_admin.sql`. It is idempotent (`ON CONFLICT DO NOTHING`). Re-run it anytime new modules or actions are added to the permission matrix.

---

## 5. External Services & Environment

### Environment Variables
- `.env*` files are gitignored. New vars must be documented.
- Prefix client-only access with `NEXT_PUBLIC_`. Everything else stays server-side.
- `APP_URL` is the absolute URL used to build links inside transactional emails (no trailing slash). Local dev: `http://localhost:3000`.

### Storage (Azure Blob)
Binary uploads live in **Azure Blob Storage**, NOT Azure Files.
- Configured via `AZURE_STORAGE_ACCOUNT`, `AZURE_STORAGE_CONTAINER`, and `AZURE_STORAGE_CONNECTION_STRING`. The connection string is a master credential; never commit it.
- Container's "Public access level" must be **Blob**. "Allow Blob anonymous access" must be enabled at the storage-account level.
- Container layout uses a feature prefix: `course-covers/`, `student-avatars/`, `submissions/`.
- Blob names are `<prefix>/<uuid>.<ext>`. Original filenames are discarded; only the content type drives the extension.
- The browser **never** sees the connection string. Uploads always proxy through a server action that authenticates, permission-checks, validates the `File`, and calls the upload helper.
- Allowed image types are an explicit allow-list (`image/png|jpeg|webp|gif|svg+xml`) with a 5 MB cap. Use `UnsupportedFileTypeError` and `FileTooLargeError`.

### Email (Gmail SMTP)
Transactional email goes through **Gmail SMTP**.
- Configured via `EMAIL_USER`, `EMAIL_APP_PASSWORD` (spaces stripped automatically), and `EMAIL_FROM_NAME`.
- All sending goes through `lib/email/mailer.ts → sendMail()`. The transporter is created lazily and cached per process. It returns a discriminated `SendResult` (`{ ok: true | false, reason }`) and **never throws**.
- Templates live in `lib/email/templates/<name>.ts` and export `render<Name>Email(input): { subject, text, html }`. Always render BOTH plain-text and HTML bodies. Use `htmlEscape` for user-supplied strings.
- HTML templates must be inline-CSS only and use table-based layouts.
- Server actions that depend on email MUST treat the send as best-effort: succeed first (DB writes done), then send. On failure, return enough state for the admin to recover manually. Never delete the user record because mail bounced.

### Temporary Passwords
When creating a Firebase user on behalf of a student/employee, generate the password with `lib/auth/passwords.ts → generateTemporaryPassword()`:
- 14-char default length, mix of upper/lower/digits/symbols (at least one of each), seeded by `crypto.randomInt`.
- Avoids visually-ambiguous glyphs (`0/O`, `1/l/I`).
- The plaintext password lives in memory exactly long enough to hand to Firebase and embed in the welcome email. **Never log it, never persist it in the DB, never return it to the client** except in the one-time fallback panel when the email fails.

---

## 6. API & Code Quality Rules

- **Early Returns**: Use early returns for validation and authorization checks to avoid deep nesting.
- **Validation**: Validate all incoming request data at the beginning of the route handler. Return `400 Bad Request` for missing or invalid fields.
- **Error Responses**: Always return errors in the format `{ error: "Human-readable message" }` with the appropriate HTTP status code (400, 401, 403, 404, 409, 500).
- **Logging**: Log unexpected errors using `console.error` with context. Never log token payloads or password fields.
- **Server-Only Code**: Ensure modules that import `@neondatabase/serverless`, `firebase-admin`, or Prisma are **only** imported in Server Components or API Routes. Never import them in Client Components (`"use client"`).
- **Linting**: Run `npm run lint` before committing. The ESLint configuration enforces TypeScript and Next.js best practices.
