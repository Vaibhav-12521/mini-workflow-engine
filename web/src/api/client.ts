import type {
  Activity,
  ApiErrorBody,
  CreateTaskInput,
  ErrorCode,
  ListTasksQuery,
  Paginated,
  Task,
  UpdateTaskInput,
} from '@mwe/shared';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ErrorCode | 'NETWORK',
    message: string,
    public readonly details: ApiErrorBody['error']['details'] = [],
  ) {
    super(message);
  }

  fieldErrors(): Record<string, string> {
    if (!Array.isArray(this.details)) return {};
    return Object.fromEntries(this.details.map((d) => [d.path, d.message]));
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init.headers },
    });
  } catch {
    throw new ApiError(0, 'NETWORK', 'Cannot reach the server. Check that the API is running.');
  }
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const e = (body as ApiErrorBody | null)?.error;
    throw new ApiError(res.status, e?.code ?? 'INTERNAL', e?.message ?? `Request failed (${res.status})`, e?.details);
  }
  return body as T;
}

type ListParams = Partial<Record<keyof ListTasksQuery, string | number | undefined>>;

const toQuery = (p: ListParams) => {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(p)) if (v !== undefined && v !== '') qs.set(k, String(v));
  const s = qs.toString();
  return s ? `?${s}` : '';
};

export const tasksApi = {
  list: (params: ListParams) => request<Paginated<Task>>(`/tasks${toQuery(params)}`),
  get: (id: string) => request<Task>(`/tasks/${encodeURIComponent(id)}`),
  create: (input: CreateTaskInput) => request<Task>('/tasks', { method: 'POST', body: JSON.stringify(input) }),
  update: (id: string, input: UpdateTaskInput) =>
    request<Task>(`/tasks/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(input) }),
  remove: (id: string) => request<void>(`/tasks/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  activities: (id: string) =>
    request<{ data: Activity[] }>(`/tasks/${encodeURIComponent(id)}/activities`).then((r) => r.data),
};
