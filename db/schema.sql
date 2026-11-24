-- Mini Workflow Engine — schema (PostgreSQL 15+, also runs on embedded PGlite)
-- Idempotent: safe to run on a clean or an existing database.
--
-- Allowed statuses and priorities are NOT hard-coded here. They live in lookup tables whose rows are
-- synced from the one shared definition (shared/src/domain.ts) by server/src/db/migrate.ts.
-- The `tasks` table references them with foreign keys, so the database still rejects bad values.

-- Lookup: allowed statuses. `position` gives a stable workflow order for sorting by status.
CREATE TABLE IF NOT EXISTS task_statuses (
  code      TEXT PRIMARY KEY,
  label     TEXT NOT NULL,
  position  SMALLINT NOT NULL
);

-- Lookup: allowed priorities. `rank` lets us sort Low < Medium < High instead of alphabetically.
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
  -- Optimistic-concurrency token: incremented on every update. A PATCH must send the version it read.
  version      INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Soft delete: the row (and therefore its history) is kept; the API treats it as gone (404).
  deleted_at   TIMESTAMPTZ NULL,
  CHECK (updated_at >= created_at)
);

-- Append-only history. One row per event; an edit that changes 2 fields writes 2 rows (one per field).
CREATE TABLE IF NOT EXISTS task_activities (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     UUID NOT NULL REFERENCES tasks (id) ON DELETE CASCADE,
  action      TEXT NOT NULL CHECK (action IN ('created', 'edited', 'status_changed', 'deleted')),
  field       TEXT NULL CHECK (field IN ('title', 'description', 'priority', 'status')),
  old_value   TEXT NULL,
  new_value   TEXT NULL,
  actor_id    TEXT NULL, -- optional (no auth in scope); reserved for "who made the change"
  created_at  TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  -- An edit / status change must say which field changed.
  CHECK (action NOT IN ('edited', 'status_changed') OR field IS NOT NULL)
);

-- ---------- Indexes (each serves a real query; see docs/database.md) ----------

-- Default list: live tasks newest-updated first. Partial index skips soft-deleted rows.
CREATE INDEX IF NOT EXISTS idx_tasks_live_updated
  ON tasks (updated_at DESC, id) WHERE deleted_at IS NULL;

-- Filter by status (+ default sort) — e.g. "all In progress tasks, newest first".
CREATE INDEX IF NOT EXISTS idx_tasks_live_status_updated
  ON tasks (status, updated_at DESC) WHERE deleted_at IS NULL;

-- Filter by priority (+ default sort).
CREATE INDEX IF NOT EXISTS idx_tasks_live_priority_updated
  ON tasks (priority, updated_at DESC) WHERE deleted_at IS NULL;

-- Timeline for one task in time order. Also covers the FK task_activities.task_id.
CREATE INDEX IF NOT EXISTS idx_task_activities_task_created
  ON task_activities (task_id, created_at, id);
