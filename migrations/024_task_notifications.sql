-- ============================================================
-- 024_task_notifications.sql
-- In-app notification rows written when an employee self-claims
-- a task. The manager sees these in the notification bell.
-- Dependencies: 022_tasks.sql (tasks), 006_rbac.sql (admin_accounts)
-- ============================================================

CREATE TABLE IF NOT EXISTS task_notifications (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id    UUID        NOT NULL REFERENCES admin_accounts(id) ON DELETE CASCADE,
  task_id         UUID        NOT NULL REFERENCES tasks(id)          ON DELETE CASCADE,
  claimant_id     UUID        NOT NULL REFERENCES admin_accounts(id) ON DELETE CASCADE,
  message         TEXT        NOT NULL,
  action_url      TEXT,
  is_read         BOOLEAN     NOT NULL DEFAULT FALSE,
  reassigned_to   UUID        REFERENCES admin_accounts(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  task_notifications                IS 'In-app notification rows for self-assign claim events. One row per manager notified.';
COMMENT ON COLUMN task_notifications.recipient_id   IS 'Admin (manager/assigner) who should see this notification.';
COMMENT ON COLUMN task_notifications.task_id        IS 'The task that was claimed.';
COMMENT ON COLUMN task_notifications.claimant_id    IS 'Admin who claimed the task.';
COMMENT ON COLUMN task_notifications.message        IS 'Human-readable notification message.';
COMMENT ON COLUMN task_notifications.action_url     IS 'Deep-link to the task detail page.';
COMMENT ON COLUMN task_notifications.is_read        IS 'TRUE after the recipient opens the notification dropdown.';
COMMENT ON COLUMN task_notifications.reassigned_to  IS 'Set when the manager reassigns to a different admin.';

CREATE INDEX IF NOT EXISTS idx_task_notifications_recipient ON task_notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_task_notifications_task      ON task_notifications(task_id);
CREATE INDEX IF NOT EXISTS idx_task_notifications_unread    ON task_notifications(recipient_id) WHERE is_read = FALSE;
