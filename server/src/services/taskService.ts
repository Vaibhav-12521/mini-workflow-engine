import {
  DEFAULT_PRIORITY,
  DEFAULT_STATUS,
  type Activity,
  type EditableField,
  type ListTasksQuery,
  type Paginated,
  type Task,
} from '@mwe/shared';
import type { Database } from '../db/client';
import { conflict, notFound } from '../http/errors';
import { activityRepository } from '../repositories/activityRepository';
import { taskRepository, type TaskChanges } from '../repositories/taskRepository';

/** Validated input the service receives (routes have already run the zod schemas). */
export interface CreateTask {
  title: string;
  description: string;
  priority?: Task['priority'];
  status?: Task['status'];
}
export interface UpdateTask extends Partial<Pick<Task, 'title' | 'description' | 'priority' | 'status'>> {
  version: number;
}

const FIELDS: EditableField[] = ['title', 'description', 'priority', 'status'];

/**
 * Business rules live here:
 *  - every write and its activity row(s) share ONE transaction (all or nothing)
 *  - optimistic concurrency via `version` (stale write → 409, never a silent overwrite)
 *  - an edit records one activity row per field that actually changed, with old and new values
 */
export function createTaskService(db: Database) {
  return {
    async create(input: CreateTask): Promise<Task> {
      return db.transaction(async (tx) => {
        const task = await taskRepository.insert(tx, {
          title: input.title,
          description: input.description,
          priority: input.priority ?? DEFAULT_PRIORITY,
          status: input.status ?? DEFAULT_STATUS,
        });
        await activityRepository.insert(tx, { taskId: task.id, action: 'created', newValue: task.title });
        return task;
      });
    },

    async get(id: string): Promise<Task> {
      const task = await taskRepository.findById(db, id);
      if (!task) throw notFound();
      return task;
    },

    async update(id: string, input: UpdateTask): Promise<Task> {
      return db.transaction(async (tx) => {
        // Lock the row: a second concurrent update waits here until we commit,
        // then sees the new version and gets a 409 instead of overwriting our change.
        const current = await taskRepository.findById(tx, id, { forUpdate: true });
        if (!current) throw notFound();
        if (current.version !== input.version) {
          throw conflict('This task was changed by someone else. Reload and try again.', {
            expectedVersion: input.version,
            currentVersion: current.version,
            current,
          });
        }

        const changes: TaskChanges = {};
        for (const f of FIELDS) {
          const next = input[f];
          if (next !== undefined && next !== current[f]) (changes as Record<string, string>)[f] = next;
        }
        if (Object.keys(changes).length === 0) return current; // no-op: no write, no history noise

        const updated = await taskRepository.update(tx, id, changes);
        for (const f of Object.keys(changes) as EditableField[]) {
          await activityRepository.insert(tx, {
            taskId: id,
            action: f === 'status' ? 'status_changed' : 'edited',
            field: f,
            oldValue: current[f],
            newValue: updated[f],
          });
        }
        return updated;
      });
    },

    async remove(id: string): Promise<void> {
      await db.transaction(async (tx) => {
        const current = await taskRepository.findById(tx, id, { forUpdate: true });
        if (!current) throw notFound();
        await taskRepository.softDelete(tx, id);
        await activityRepository.insert(tx, { taskId: id, action: 'deleted', oldValue: current.title });
      });
    },

    async list(query: ListTasksQuery): Promise<Paginated<Task>> {
      const { rows, total } = await taskRepository.list(db, query);
      return {
        data: rows,
        pagination: {
          page: query.page,
          pageSize: query.pageSize,
          total,
          totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
        },
      };
    },

    async activities(taskId: string): Promise<Activity[]> {
      if (!(await taskRepository.findById(db, taskId))) throw notFound();
      return activityRepository.listForTask(db, taskId);
    },
  };
}

export type TaskService = ReturnType<typeof createTaskService>;
