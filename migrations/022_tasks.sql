-- ============================================================
-- 022_tasks.sql
-- Task Management Schema — internal employee task tracking
-- Introduces: task_projects, task_sprints, tasks, task_attachments,
--             task_comments, task_audit_log, task_sprint_snapshots
-- Dependencies: 010_employees.sql (departments), 006_rbac.sql (admin_accounts)
-- NOTE: Uses ENUM types for type safety on status/priority/visibility/etc.
-- ============================================================

-- ----------------------------------------------------------------
-- ENUM types
-- ----------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE task_type AS ENUM ('bug', 'feature', 'task');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE task_status AS ENUM ('todo', 'doing', 'completed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'critical');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE task_visibility AS ENUM ('public', 'private', 'confidential');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE task_approval_status AS ENUM ('pending', 'confirmed', 'reassigned');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ----------------------------------------------------------------
-- Projects / Boards table
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS task_projects (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(200) NOT NULL,
  description   TEXT,
  department_id UUID        REFERENCES departments(id),
  is_active     BOOLEAN     DEFAULT TRUE,
  created_by    UUID        NOT NULL REFERENCES admin_accounts(id),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE  task_projects               IS 'Project boards that group related tasks together, optionally scoped to a department.';
COMMENT ON COLUMN task_projects.name          IS 'Human-readable project name.';
COMMENT ON COLUMN task_projects.department_id IS 'Optional FK to departments; NULL = cross-department project.';
COMMENT ON COLUMN task_projects.is_active     IS 'Soft-delete flag. FALSE = archived project.';
COMMENT ON COLUMN task_projects.created_by    IS 'Admin who created the project.';

-- ----------------------------------------------------------------
-- Sprints / Milestones (belongs to a project)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS task_sprints (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID        NOT NULL REFERENCES task_projects(id) ON DELETE CASCADE,
  name       VARCHAR(200) NOT NULL,
  start_date DATE,
  end_date   DATE,
  is_active  BOOLEAN     DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE  task_sprints            IS 'Sprint or milestone container within a project. Used for burndown charts and time-boxing.';
COMMENT ON COLUMN task_sprints.project_id IS 'FK to the parent project.';
COMMENT ON COLUMN task_sprints.is_active  IS 'FALSE = sprint closed/completed.';

-- ----------------------------------------------------------------
-- Core tasks table
-- ----------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS task_id_seq START 1000;

CREATE TABLE IF NOT EXISTS tasks (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     VARCHAR(20) UNIQUE NOT NULL DEFAULT '', -- filled by trigger e.g. TASK-1042
  title       VARCHAR(500) NOT NULL,
  description TEXT,
  note        TEXT,
  type        task_type       NOT NULL DEFAULT 'task',
  status      task_status     NOT NULL DEFAULT 'todo',
  priority    task_priority   NOT NULL DEFAULT 'medium',
  visibility  task_visibility NOT NULL DEFAULT 'public',
  is_active   BOOLEAN         NOT NULL DEFAULT TRUE,  -- FALSE = soft-deleted/disabled

  -- Relationships
  project_id     UUID REFERENCES task_projects(id),
  sprint_id      UUID REFERENCES task_sprints(id),
  department_id  UUID REFERENCES departments(id),
  parent_task_id UUID REFERENCES tasks(id),   -- sub-tasks

  -- People
  created_by UUID NOT NULL REFERENCES admin_accounts(id),
  assigned_by UUID REFERENCES admin_accounts(id),
  assigned_to UUID REFERENCES admin_accounts(id),
  reviewer_id UUID REFERENCES admin_accounts(id),

  -- Time
  due_date         DATE,
  estimated_hours  NUMERIC(6,2),
  logged_hours     NUMERIC(6,2) DEFAULT 0,

  -- Self-assign backlog flow
  self_assigned               BOOLEAN     DEFAULT FALSE,
  self_assign_approval_status task_approval_status,
  self_assign_notified_at     TIMESTAMPTZ,
  self_assign_deadline        TIMESTAMPTZ, -- 48 h after self_assign_notified_at

  -- Timestamps
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

COMMENT ON TABLE  tasks                           IS 'Core task records for internal employee task management. Distinct from student assignment tasks.';
COMMENT ON COLUMN tasks.task_id                   IS 'Human-readable identifier auto-generated by trigger (e.g. TASK-1042).';
COMMENT ON COLUMN tasks.type                      IS 'bug | feature | task';
COMMENT ON COLUMN tasks.status                    IS 'todo | doing | completed';
COMMENT ON COLUMN tasks.priority                  IS 'low | medium | high | critical';
COMMENT ON COLUMN tasks.visibility                IS 'public = visible to all team; private = assigned parties only; confidential = management only.';
COMMENT ON COLUMN tasks.is_active                 IS 'FALSE = soft-deleted. Never hard-delete task rows.';
COMMENT ON COLUMN tasks.parent_task_id            IS 'Self-referencing FK for sub-tasks. NULL = top-level task.';
COMMENT ON COLUMN tasks.assigned_by               IS 'Admin who assigned the task to assigned_to.';
COMMENT ON COLUMN tasks.assigned_to               IS 'Admin account that owns this task.';
COMMENT ON COLUMN tasks.reviewer_id               IS 'Admin responsible for reviewing completed work.';
COMMENT ON COLUMN tasks.estimated_hours           IS 'Planned effort in hours.';
COMMENT ON COLUMN tasks.logged_hours              IS 'Cumulative actual hours logged against this task.';
COMMENT ON COLUMN tasks.self_assigned             IS 'TRUE if the assignee self-claimed from the backlog.';
COMMENT ON COLUMN tasks.self_assign_approval_status IS 'Approval state for self-claimed tasks: pending | confirmed | reassigned.';
COMMENT ON COLUMN tasks.self_assign_deadline      IS '48 h window after notification for manager to confirm/reassign.';
COMMENT ON COLUMN tasks.completed_at              IS 'Timestamp when status moved to completed.';

-- Auto-generate task_id
CREATE OR REPLACE FUNCTION generate_task_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.task_id IS NULL OR NEW.task_id = '' THEN
    NEW.task_id := 'TASK-' || nextval('task_id_seq');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_task_id ON tasks;
CREATE TRIGGER set_task_id
BEFORE INSERT ON tasks
FOR EACH ROW
EXECUTE FUNCTION generate_task_id();

-- ----------------------------------------------------------------
-- Task attachments
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS task_attachments (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id         UUID         NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  file_name       VARCHAR(500) NOT NULL,
  file_key        VARCHAR(1000) NOT NULL,  -- S3 key
  file_size_bytes BIGINT,
  mime_type       VARCHAR(200),
  uploaded_by     UUID         NOT NULL REFERENCES admin_accounts(id),
  uploaded_at     TIMESTAMPTZ  DEFAULT NOW()
);

COMMENT ON TABLE  task_attachments          IS 'Files attached to tasks. Stored in S3; file_key is the S3 object key.';
COMMENT ON COLUMN task_attachments.file_key IS 'S3 object key. Use generateViewPresignedUrl(file_key) to produce a download URL.';

-- ----------------------------------------------------------------
-- Task comments
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS task_comments (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id    UUID        NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  author_id  UUID        NOT NULL REFERENCES admin_accounts(id),
  body       TEXT        NOT NULL,
  is_active  BOOLEAN     DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE  task_comments           IS 'Threaded comments on a task. Soft-deleted via is_active.';
COMMENT ON COLUMN task_comments.body      IS 'Markdown-safe comment body text.';
COMMENT ON COLUMN task_comments.is_active IS 'FALSE = soft-deleted. Hidden from UI but preserved for audit.';

-- ----------------------------------------------------------------
-- Audit trail (append-only — never UPDATE or DELETE rows here)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS task_audit_log (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     UUID        NOT NULL REFERENCES tasks(id),
  changed_by  UUID        NOT NULL REFERENCES admin_accounts(id),
  changed_at  TIMESTAMPTZ DEFAULT NOW(),
  field_name  VARCHAR(200) NOT NULL,
  old_value   TEXT,
  new_value   TEXT,
  action      VARCHAR(100) NOT NULL
  -- action examples: 'created' | 'updated' | 'disabled' | 'self_assigned'
  --                  | 'attachment_added' | 'attachment_removed' | 'commented'
);

COMMENT ON TABLE  task_audit_log          IS 'Append-only change log for all task mutations. Never update or delete rows.';
COMMENT ON COLUMN task_audit_log.action   IS 'Verb describing the change: created, updated, disabled, self_assigned, attachment_added, commented, etc.';
COMMENT ON COLUMN task_audit_log.old_value IS 'Stringified previous value (NULL on creation).';
COMMENT ON COLUMN task_audit_log.new_value IS 'Stringified new value.';

-- ----------------------------------------------------------------
-- Daily sprint snapshot (burndown chart source)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS task_sprint_snapshots (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sprint_id        UUID NOT NULL REFERENCES task_sprints(id),
  snapshot_date    DATE NOT NULL,
  total_tasks      INT  DEFAULT 0,
  completed_tasks  INT  DEFAULT 0,
  todo_tasks       INT  DEFAULT 0,
  doing_tasks      INT  DEFAULT 0,
  UNIQUE(sprint_id, snapshot_date)
);

COMMENT ON TABLE task_sprint_snapshots IS 'Daily snapshot of task counts per sprint. Written by a scheduled job for burndown chart rendering.';

-- ----------------------------------------------------------------
-- Indexes
-- ----------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to       ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id        ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_sprint_id         ON tasks(sprint_id);
CREATE INDEX IF NOT EXISTS idx_tasks_department_id     ON tasks(department_id);
CREATE INDEX IF NOT EXISTS idx_tasks_parent_task_id    ON tasks(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_is_active         ON tasks(is_active);
CREATE INDEX IF NOT EXISTS idx_tasks_status            ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date          ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_task_audit_log_task_id  ON task_audit_log(task_id);
CREATE INDEX IF NOT EXISTS idx_task_audit_log_changed  ON task_audit_log(changed_at);
CREATE INDEX IF NOT EXISTS idx_task_attachments_task   ON task_attachments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_task      ON task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_projects_dept      ON task_projects(department_id);
CREATE INDEX IF NOT EXISTS idx_task_sprints_project    ON task_sprints(project_id);
