CREATE TABLE IF NOT EXISTS task_statuses (
  code      TEXT PRIMARY KEY,
  label     TEXT NOT NULL,
  position  SMALLINT NOT NULL
);

CREATE TABLE IF NOT EXISTS task_priorities (
  code   TEXT PRIMARY KEY,
  label  TEXT NOT NULL,
  rank   SMALLINT NOT NULL
);

CREATE TABLE IF NOT EXISTS tasks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 200),
  description  TEXT NOT NULL DEFAULT '' CHECK (char_length(description) <= 5000),
  priority     TEXT NOT NULL REFERENCES task_priorities (code) ON UPDATE CASCADE ON DELETE RESTRICT,
  status       TEXT NOT NULL REFERENCES task_statuses (code)   ON UPDATE CASCADE ON DELETE RESTRICT,

  version      INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

  deleted_at   TIMESTAMPTZ NULL,
  CHECK (updated_at >= created_at)
);

CREATE TABLE IF NOT EXISTS task_activities (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     UUID NOT NULL REFERENCES tasks (id) ON DELETE CASCADE,
  action      TEXT NOT NULL CHECK (action IN ('created', 'edited', 'status_changed', 'deleted')),
  field       TEXT NULL CHECK (field IN ('title', 'description', 'priority', 'status')),
  old_value   TEXT NULL,
  new_value   TEXT NULL,
  actor_id    TEXT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  seq         BIGINT GENERATED ALWAYS AS IDENTITY,

  CHECK (action NOT IN ('edited', 'status_changed') OR field IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_tasks_live_updated
  ON tasks (updated_at DESC, id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_live_status_updated
  ON tasks (status, updated_at DESC) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_live_priority_updated
  ON tasks (priority, updated_at DESC) WHERE deleted_at IS NULL;

ALTER TABLE task_activities ADD COLUMN IF NOT EXISTS seq BIGINT GENERATED ALWAYS AS IDENTITY;

DROP INDEX IF EXISTS idx_task_activities_task_created;
CREATE INDEX IF NOT EXISTS idx_task_activities_task_order
  ON task_activities (task_id, created_at, seq);
