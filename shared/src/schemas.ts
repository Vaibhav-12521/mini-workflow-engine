import { z } from 'zod';
import {
  DEFAULT_ORDER,
  DEFAULT_SORT,
  DESCRIPTION_MAX,
  PAGE_SIZE_DEFAULT,
  PAGE_SIZE_MAX,
  PRIORITY_VALUES,
  SORT_FIELDS,
  STATUS_VALUES,
  TITLE_MAX,
  type ActivityAction,
  type EditableField,
  type TaskPriority,
  type TaskStatus,
} from './domain';

export const statusSchema = z.enum(STATUS_VALUES, {
  error: () => `Status must be one of: ${STATUS_VALUES.join(', ')}`,
});
export const prioritySchema = z.enum(PRIORITY_VALUES, {
  error: () => `Priority must be one of: ${PRIORITY_VALUES.join(', ')}`,
});

const titleSchema = z
  .string({ error: 'Title is required' })
  .trim()
  .min(1, 'Title is required')
  .max(TITLE_MAX, `Title must be at most ${TITLE_MAX} characters`);

const descriptionSchema = z
  .string()
  .trim()
  .max(DESCRIPTION_MAX, `Description must be at most ${DESCRIPTION_MAX} characters`);

export const createTaskSchema = z.strictObject({
  title: titleSchema,
  description: descriptionSchema.optional().default(''),
  priority: prioritySchema.optional(),
  status: statusSchema.optional(),
});
export type CreateTaskInput = z.input<typeof createTaskSchema>;

export const updateTaskSchema = z
  .strictObject({
    title: titleSchema.optional(),
    description: descriptionSchema.optional(),
    priority: prioritySchema.optional(),
    status: statusSchema.optional(),
    version: z.number({ error: 'version is required' }).int().positive(),
  })
  .refine((v) => ['title', 'description', 'priority', 'status'].some((k) => k in v), {
    message: 'Provide at least one field to update',
  });
export type UpdateTaskInput = z.input<typeof updateTaskSchema>;

export const taskFormSchema = z.object({
  title: titleSchema,
  description: descriptionSchema,
  priority: prioritySchema,
  status: statusSchema,
});
export type TaskFormValues = z.infer<typeof taskFormSchema>;

const emptyToUndefined = (v: unknown) => (v === '' || v === null ? undefined : v);

export const listTasksQuerySchema = z.object({
  status: z.preprocess(emptyToUndefined, statusSchema.optional()),
  priority: z.preprocess(emptyToUndefined, prioritySchema.optional()),
  q: z.preprocess(emptyToUndefined, z.string().trim().max(200).optional()),
  page: z.preprocess(emptyToUndefined, z.coerce.number().int().min(1).default(1)),
  pageSize: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(1).max(PAGE_SIZE_MAX).default(PAGE_SIZE_DEFAULT),
  ),
  sort: z.preprocess(emptyToUndefined, z.enum(SORT_FIELDS).default(DEFAULT_SORT)),
  order: z.preprocess(emptyToUndefined, z.enum(['asc', 'desc']).default(DEFAULT_ORDER)),
});
export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>;

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface Activity {
  id: string;
  taskId: string;
  action: ActivityAction;
  field: EditableField | null;
  oldValue: string | null;
  newValue: string | null;
  actorId: string | null;
  createdAt: string;
}

export interface Paginated<T> {
  data: T[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}

export type ErrorCode = 'VALIDATION_FAILED' | 'BAD_REQUEST' | 'NOT_FOUND' | 'CONFLICT' | 'INTERNAL';

export interface ApiErrorBody {
  error: {
    code: ErrorCode;
    message: string;
    details: Array<{ path: string; message: string }> | Record<string, unknown>;
  };
}
