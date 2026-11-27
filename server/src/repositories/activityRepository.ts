import type { Activity, ActivityAction, EditableField } from '@mwe/shared';
import type { Queryable } from '../db/client';

interface ActivityRow {
  id: string;
  task_id: string;
  action: ActivityAction;
  field: EditableField | null;
  old_value: string | null;
  new_value: string | null;
  actor_id: string | null;
  created_at: Date | string;
}

const toActivity = (r: ActivityRow): Activity => ({
  id: r.id,
  taskId: r.task_id,
  action: r.action,
  field: r.field,
  oldValue: r.old_value,
  newValue: r.new_value,
  actorId: r.actor_id,
  createdAt: (r.created_at instanceof Date ? r.created_at : new Date(r.created_at)).toISOString(),
});

export interface NewActivity {
  taskId: string;
  action: ActivityAction;
  field?: EditableField | null;
  oldValue?: string | null;
  newValue?: string | null;
  actorId?: string | null;
}

export const activityRepository = {
  async insert(q: Queryable, a: NewActivity): Promise<void> {
    await q.query(
      `INSERT INTO task_activities (task_id, action, field, old_value, new_value, actor_id)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [a.taskId, a.action, a.field ?? null, a.oldValue ?? null, a.newValue ?? null, a.actorId ?? null],
    );
  },

  async listForTask(q: Queryable, taskId: string): Promise<Activity[]> {
    const { rows } = await q.query<ActivityRow>(
      `SELECT id, task_id, action, field, old_value, new_value, actor_id, created_at
       FROM task_activities
       WHERE task_id = $1
       ORDER BY created_at ASC, seq ASC`,
      [taskId],
    );
    return rows.map(toActivity);
  },
};
