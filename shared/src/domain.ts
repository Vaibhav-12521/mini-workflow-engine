/**
 * THE single definition of task statuses and priorities.
 *
 * Everything else derives from this file:
 *  - API validation (zod enums in ./schemas.ts)
 *  - Database lookup tables `task_statuses` / `task_priorities` (synced by server/src/db/migrate.ts,
 *    enforced on `tasks` via foreign keys)
 *  - UI dropdowns, chips and labels (web/src/components/Chip.tsx)
 *  - Tests (server/tests)
 *
 * To add a status (e.g. "blocked"): add one entry to STATUSES below, then run `npm run db:migrate`.
 */

export const STATUSES = [
  { value: 'todo', label: 'To do', icon: '○', tone: 'neutral' },
  { value: 'in_progress', label: 'In progress', icon: '◐', tone: 'info' },
  { value: 'done', label: 'Done', icon: '●', tone: 'success' },
] as const;

export const PRIORITIES = [
  { value: 'low', label: 'Low', icon: '▼', tone: 'neutral' },
  { value: 'medium', label: 'Medium', icon: '■', tone: 'warning' },
  { value: 'high', label: 'High', icon: '▲', tone: 'danger' },
] as const;

export type ChipTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

export type TaskStatus = (typeof STATUSES)[number]['value'];
export type TaskPriority = (typeof PRIORITIES)[number]['value'];

export const STATUS_VALUES = STATUSES.map((s) => s.value) as [TaskStatus, ...TaskStatus[]];
export const PRIORITY_VALUES = PRIORITIES.map((p) => p.value) as [TaskPriority, ...TaskPriority[]];

/** Status every new task starts in (assumption from the brief). */
export const DEFAULT_STATUS: TaskStatus = 'todo';
export const DEFAULT_PRIORITY: TaskPriority = 'medium';

export const statusMeta = (value: string) => STATUSES.find((s) => s.value === value);
export const priorityMeta = (value: string) => PRIORITIES.find((p) => p.value === value);

/** Activity actions written to `task_activities.action`. */
export const ACTIVITY_ACTIONS = ['created', 'edited', 'status_changed', 'deleted'] as const;
export type ActivityAction = (typeof ACTIVITY_ACTIONS)[number];

/** Fields a user may edit. `field` on an activity row is one of these. */
export const EDITABLE_FIELDS = ['title', 'description', 'priority', 'status'] as const;
export type EditableField = (typeof EDITABLE_FIELDS)[number];

/** List configuration (documented in README). */
export const PAGE_SIZE_DEFAULT = 10;
export const PAGE_SIZE_MAX = 50;
export const SORT_FIELDS = ['updated_at', 'created_at', 'title', 'priority', 'status'] as const;
export type SortField = (typeof SORT_FIELDS)[number];
export const DEFAULT_SORT: SortField = 'updated_at';
export const DEFAULT_ORDER = 'desc' as const;

export const TITLE_MAX = 200;
export const DESCRIPTION_MAX = 5000;
