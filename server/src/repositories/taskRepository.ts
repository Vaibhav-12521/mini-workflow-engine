import type { ListTasksQuery, SortField, Task, TaskPriority, TaskStatus } from '@mwe/shared';
import type { Queryable } from '../db/client';

/** Data access only: SQL in, typed rows out. No business rules here. */

interface TaskRow {
  id: string;
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  version: number;
  created_at: Date | string;
  updated_at: Date | string;
}

const COLUMNS = 't.id, t.title, t.description, t.priority, t.status, t.version, t.created_at, t.updated_at';

const toIso = (v: Date | string) => (v instanceof Date ? v : new Date(v)).toISOString();

export const toTask = (r: TaskRow): Task => ({
  id: r.id,
  title: r.title,
  description: r.description,
  priority: r.priority,
  status: r.status,
  version: r.version,
  createdAt: toIso(r.created_at),
  updatedAt: toIso(r.updated_at),
});

/**
 * Whitelisted ORDER BY expressions. The client picks a key; it never sends SQL.
 * priority/status sort by their lookup rank/position (Low < Medium < High), not alphabetically.
 */
const SORT_SQL: Record<SortField, string> = {
  updated_at: 't.updated_at',
  created_at: 't.created_at',
  title: 'lower(t.title)',
  priority: 'p.rank',
  status: 's.position',
};

/** Escape LIKE wildcards so searching for "50%" matches the literal text. */
const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

export interface NewTask {
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
}

export type TaskChanges = Partial<NewTask>;

export const taskRepository = {
  async insert(q: Queryable, t: NewTask): Promise<Task> {
    const { rows } = await q.query<TaskRow>(
      `INSERT INTO tasks AS t (title, description, priority, status)
       VALUES ($1, $2, $3, $4)
       RETURNING ${COLUMNS}`,
      [t.title, t.description, t.priority, t.status],
    );
    return toTask(rows[0]);
  },

  /** Live (not soft-deleted) task. `forUpdate` locks the row until the transaction ends. */
  async findById(q: Queryable, id: string, opts: { forUpdate?: boolean } = {}): Promise<Task | null> {
    const { rows } = await q.query<TaskRow>(
      `SELECT ${COLUMNS} FROM tasks t
       WHERE t.id = $1 AND t.deleted_at IS NULL
       ${opts.forUpdate ? 'FOR UPDATE' : ''}`,
      [id],
    );
    return rows[0] ? toTask(rows[0]) : null;
  },

  /** Applies the changes, bumps version and updated_at. Only columns in `changes` are touched. */
  async update(q: Queryable, id: string, changes: TaskChanges): Promise<Task> {
    const entries = Object.entries(changes).filter(([, v]) => v !== undefined);
    // Column names come from the typed TaskChanges keys, values are always parameters.
    const sets = entries.map(([col], i) => `${col} = $${i + 2}`);
    const { rows } = await q.query<TaskRow>(
      `UPDATE tasks AS t
       SET ${[...sets, 'version = t.version + 1', 'updated_at = clock_timestamp()'].join(', ')}
       WHERE t.id = $1 AND t.deleted_at IS NULL
       RETURNING ${COLUMNS}`,
      [id, ...entries.map(([, v]) => v)],
    );
    return toTask(rows[0]);
  },

  async softDelete(q: Queryable, id: string): Promise<void> {
    await q.query(
      `UPDATE tasks SET deleted_at = clock_timestamp(), version = version + 1
       WHERE id = $1 AND deleted_at IS NULL`,
      [id],
    );
  },

  /** Filtering, search, sorting and pagination all happen in SQL. */
  async list(q: Queryable, f: ListTasksQuery): Promise<{ rows: Task[]; total: number }> {
    const where: string[] = ['t.deleted_at IS NULL'];
    const params: unknown[] = [];
    const param = (v: unknown) => {
      params.push(v);
      return `$${params.length}`;
    };

    if (f.status) where.push(`t.status = ${param(f.status)}`);
    if (f.priority) where.push(`t.priority = ${param(f.priority)}`);
    if (f.q) {
      const p = param(`%${escapeLike(f.q)}%`);
      where.push(`(t.title ILIKE ${p} OR t.description ILIKE ${p})`);
    }
    const whereSql = where.join(' AND ');

    const countRes = await q.query<{ total: number }>(
      `SELECT count(*)::int AS total FROM tasks t WHERE ${whereSql}`,
      params,
    );

    const dir = f.order === 'asc' ? 'ASC' : 'DESC';
    const limit = param(f.pageSize);
    const offset = param((f.page - 1) * f.pageSize);
    const { rows } = await q.query<TaskRow>(
      `SELECT ${COLUMNS}
       FROM tasks t
       JOIN task_priorities p ON p.code = t.priority
       JOIN task_statuses   s ON s.code = t.status
       WHERE ${whereSql}
       ORDER BY ${SORT_SQL[f.sort]} ${dir}, t.id ${dir}
       LIMIT ${limit} OFFSET ${offset}`,
      params,
    );

    return { rows: rows.map(toTask), total: countRes.rows[0]?.total ?? 0 };
  },
};
