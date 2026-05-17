---
description: Postgres SQL DDL, Prisma client, Firebase auth, and learning schema conventions
globs: scripts/**/*.sql,prisma/**/*.ts,lib/db.ts,lib/auth/**/*.ts,app/api/**/*.ts,context/auth-provider.tsx,types/middleware.ts
alwaysApply: false
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
  JS SDK `signInWithEmailAndPassword` to obtain an ID token, then `POST`s
  `{ idToken }` to `/api/auth/session`.
- `app/api/auth/session/route.ts` is the only place sessions are created
  (`POST` mints, `DELETE` clears). The handler verifies the token, confirms
  the UID maps to an active row in `users.employees`, and returns 403 with
  `{ error }` if not.
- `app/admin/(home)/layout.tsx` is the hard guard for the admin app — it's a
  Server Component that calls `getCurrentEmployee()` and `redirect("/auth/login")`
  if the value is `null`. The actual UI shell (`AdminShell`, with Tabler icon
  imports) is a sibling client component that takes the resolved user as
  plain serialisable props.
- `app/admin/auth/layout.tsx` does the inverse: if a session is already valid
  it redirects authed users back to `/`, so the login page can never loop.
- The student tenant follows the same pattern once `users.students` rows
  exist. **Do not add a sign-up route under `app/student/auth/`** — student
  accounts are created by employees.
- Sign-out goes through `UserMenuNavbar`: it calls `firebase.auth().signOut()`
  client-side **and** `DELETE /api/auth/session` so both halves of the auth
  state are cleared.
- Verify session cookies / ID tokens via `adminAuth.verify…` before touching
  Prisma, and never log token payloads or password fields.

## Bootstrapping the first admin

There is no public sign-up. The very first admin is created out-of-band by
running `scripts/insert/001_bootstrap_admin.sql` after all DDL has been
applied. The script seeds:

1. The `admin` role (level 10) in `core.roles`
2. Full CRUD permissions for every module in `core.permissions`
3. Every permission attached to the `admin` role in `core.role_permissions`
4. The bootstrap admin row in `hr.employees` (including `designation`)
5. The Firebase-UID mapping in `users.employees`

Run it from the repo root:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
  -v firebase_uid="'<UID>'" \
  -v admin_email="'<email>'" \
  -v admin_name="'<full name>'" \
  -v admin_designation="'<title>'" \
  -f scripts/insert/001_bootstrap_admin.sql
```

It is idempotent (`ON CONFLICT DO NOTHING` everywhere). Re-run it anytime new
modules or actions are added to the permission matrix — only the new rows will
be inserted. Any later admins are created from inside the app via
`/admin/employees/new` and reuse the same `admin` role row.

## Environment

- `.env*` files are gitignored — do not commit them. New vars must be
  documented (in code via the missing-env error message and/or `README.md`).
- For client-only access, prefix with `NEXT_PUBLIC_`. Everything else stays
  server-side and is read from `process.env` inside server modules.

## Storage (Azure Blob)

Binary uploads (cover images, attachments, etc.) live in **Azure Blob Storage**,
NOT Azure Files. Convention:

- Single account/container per environment, configured via `AZURE_STORAGE_ACCOUNT`,
  `AZURE_STORAGE_CONTAINER`, and `AZURE_STORAGE_CONNECTION_STRING` (with the
  account key). The connection string grants FULL ADMIN to the storage account
  with no expiry, so `.env` is a master credential — never commit it, rotate
  via Azure Portal → Access keys if it ever leaks.
- The container's "Public access level" must be **Blob** so GET URLs work
  without any token. `lib/storage/azure.ts` auto-creates the container with
  `access: "blob"` on first upload — no manual provisioning needed.
- "Allow Blob anonymous access" must also be enabled at the storage-account
  level (Azure Portal → Storage account → Configuration). If it is off,
  `ensureContainer()` raises a readable error.
- Container layout uses a feature prefix: `course-covers/`, `student-avatars/`,
  `submissions/`, …
- Blob names are `<prefix>/<uuid>.<ext>` — never user-controlled. Original
  filenames are discarded; only the content type drives the extension via
  `lib/storage/azure.ts → extensionFor(type, fallback)`.
- The browser **never** sees the connection string. Uploads always proxy
  through a server action (e.g. `lib/actions/uploads.ts`) that authenticates
  the employee, permission-checks, validates the `File`, and calls
  `uploadImage(file, { prefix })`.
- Public read URLs returned to the client never carry a query string — they
  look exactly like `https://<account>.blob.core.windows.net/<container>/<prefix>/<uuid>.<ext>`.
- `@azure/storage-blob` is in `serverExternalPackages` (Turbopack) so the SDK
  is required at runtime instead of bundled.
- Allowed image types are an explicit allow-list (`image/png|jpeg|webp|gif|svg+xml`)
  with a 5 MB cap (`MAX_UPLOAD_BYTES`). Use `UnsupportedFileTypeError` and
  `FileTooLargeError` for actionable validation; let other failures throw and
  surface a generic message to the user.

## Email (Gmail SMTP)

Transactional email (welcome, password reset, notifications) goes through
**Gmail SMTP** — not SendGrid, not the Firebase default sender. Convention:

- Configured via `EMAIL_USER` (the sending Gmail address), `EMAIL_APP_PASSWORD`
  (a Google App Password — generate at <https://myaccount.google.com/apppasswords>;
  spaces are stripped automatically), and `EMAIL_FROM_NAME` (display name in the
  `From:` header).
- All sending goes through `lib/email/mailer.ts → sendMail({ to, subject, text, html })`.
  The transporter is created lazily and cached per process. `sendMail` never
  throws — it returns a discriminated `SendResult` (`{ ok: true | false, reason }`).
- Templates live in `lib/email/templates/<name>.ts` and export
  `render<Name>Email(input): { subject, text, html }`. Always render BOTH a
  plain-text body and an HTML body. Use the `htmlEscape` helper for any
  user-supplied string interpolated into the HTML.
- The HTML template must be inline-CSS only (no `<style>` blocks) and use
  table-based layouts so it renders consistently across Gmail/Outlook/iOS Mail.
- Server actions that depend on email (e.g. `createStudent`) MUST treat the
  send as best-effort: succeed first (DB writes done), then send. On failure,
  return enough state for the admin to recover manually (e.g. a fallback panel
  with the temporary password) — never delete the user record because mail bounced.

## Temporary passwords

When a server action creates a Firebase user on behalf of a student/employee,
generate the password with `lib/auth/passwords.ts → generateTemporaryPassword()`:

- 14-char default length, mix of upper / lower / digits / symbols (always at
  least one of each), seeded by `crypto.randomInt`.
- Avoids visually-ambiguous glyphs (`0/O`, `1/l/I`) so the password reads
  unambiguously when copy-pasted from an email.
- The plaintext password lives in memory exactly long enough to (a) hand to
  Firebase via `createUser({ password })` and (b) embed in the welcome email.
  Never log it, never persist it in our DB, never return it to the client
  except in the one-time fallback panel when the email fails to deliver.

## Public app URL

`APP_URL` is the absolute URL used to build links inside transactional emails
(e.g. `${APP_URL}/auth/login`). No trailing slash. Local dev uses
`http://localhost:3000`; production points at the student subdomain
(`https://students.betterinu.com`). Never hard-code these URLs.
