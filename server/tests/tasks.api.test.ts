import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { STATUSES } from '@mwe/shared';
import type { Database } from '../src/db/client';
import { createTask, setupTestApp, truncate } from './helpers';

let db: Database;
let api: Awaited<ReturnType<typeof setupTestApp>>['api'];

beforeAll(async () => {
  ({ db, api } = await setupTestApp());
});
afterAll(() => db.close());
beforeEach(() => truncate(db));

const MISSING_ID = '11111111-1111-4111-8111-111111111111';

const expectErrorShape = (body: unknown, code: string) => {
  expect(body).toMatchObject({ error: { code, message: expect.any(String), details: expect.anything() } });
};

describe('Create (US-01)', () => {
  it('T01 creates a task with defaults and records a "created" activity', async () => {
    const res = await api.post('/api/tasks').send({ title: '  Plan clean-up drive  ', priority: 'high' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ title: 'Plan clean-up drive', status: 'todo', priority: 'high', version: 1 });
    expect(res.body.createdAt).toBe(res.body.updatedAt);

    const acts = await api.get(`/api/tasks/${res.body.id}/activities`);
    expect(acts.body.data).toHaveLength(1);
    expect(acts.body.data[0]).toMatchObject({ action: 'created', newValue: 'Plan clean-up drive' });
  });

  it('T02 rejects a missing title with 422 and a field-level message', async () => {
    const res = await api.post('/api/tasks').send({ title: '   ' });
    expect(res.status).toBe(422);
    expectErrorShape(res.body, 'VALIDATION_FAILED');
    expect(res.body.error.details).toContainEqual({ path: 'title', message: 'Title is required' });
  });

  it('T03 rejects an unknown status / priority / extra field with 422', async () => {
    const res = await api.post('/api/tasks').send({ title: 'x', status: 'archived', priority: 'urgent', owner: 'me' });
    expect(res.status).toBe(422);
    const paths = res.body.error.details.map((d: { path: string }) => d.path);
    expect(paths).toEqual(expect.arrayContaining(['status', 'priority']));
  });

  it('T04 returns 400 (same error shape) for malformed JSON', async () => {
    const res = await api.post('/api/tasks').set('Content-Type', 'application/json').send('{"title": ');
    expect(res.status).toBe(400);
    expectErrorShape(res.body, 'BAD_REQUEST');
  });
});

describe('Update and status change (US-02, US-03)', () => {
  it('T05 edits fields, bumps version and updated_at, and logs old → new per changed field', async () => {
    const task = await createTask(api, { title: 'Old title', priority: 'medium' });
    await new Promise((r) => setTimeout(r, 5));

    const res = await api
      .patch(`/api/tasks/${task.id}`)
      .send({ title: 'New title', priority: 'high', description: '', version: task.version });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ title: 'New title', priority: 'high', version: 2 });
    expect(new Date(res.body.updatedAt).getTime()).toBeGreaterThan(new Date(res.body.createdAt).getTime());

    const { body } = await api.get(`/api/tasks/${task.id}/activities`);
    // description was unchanged ('' → '') so it is NOT logged.
    expect(body.data.map((a: { action: string; field: string; oldValue: string; newValue: string }) =>
      [a.action, a.field, a.oldValue, a.newValue])).toEqual([
      ['created', null, null, 'Old title'],
      ['edited', 'title', 'Old title', 'New title'],
      ['edited', 'priority', 'medium', 'high'],
    ]);
  });

  it('T06 status change is logged as "status_changed" with old and new value', async () => {
    const task = await createTask(api);
    const res = await api.patch(`/api/tasks/${task.id}`).send({ status: 'in_progress', version: 1 });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('in_progress');

    const { body } = await api.get(`/api/tasks/${task.id}/activities`);
    expect(body.data.at(-1)).toMatchObject({ action: 'status_changed', field: 'status', oldValue: 'todo', newValue: 'in_progress' });
  });

  it('T07 rejects an invalid status on update with 422 and leaves the task untouched', async () => {
    const task = await createTask(api);
    const res = await api.patch(`/api/tasks/${task.id}`).send({ status: 'finished', version: 1 });
    expect(res.status).toBe(422);
    expect(res.body.error.details[0].path).toBe('status');
    expect((await api.get(`/api/tasks/${task.id}`)).body).toMatchObject({ status: 'todo', version: 1 });
  });

  it('T08 a PATCH with no real changes writes nothing (no version bump, no activity)', async () => {
    const task = await createTask(api, { title: 'Same' });
    const res = await api.patch(`/api/tasks/${task.id}`).send({ title: 'Same', version: 1 });
    expect(res.body.version).toBe(1);
    expect((await api.get(`/api/tasks/${task.id}/activities`)).body.data).toHaveLength(1);
  });
});

describe('Not found (US-05)', () => {
  it.each([
    ['GET', (id: string) => api.get(`/api/tasks/${id}`)],
    ['PATCH', (id: string) => api.patch(`/api/tasks/${id}`).send({ title: 'x', version: 1 })],
    ['DELETE', (id: string) => api.delete(`/api/tasks/${id}`)],
    ['GET activities', (id: string) => api.get(`/api/tasks/${id}/activities`)],
  ])('T09 %s on an unknown id returns 404 in the standard shape', async (_name, call) => {
    for (const id of [MISSING_ID, 'not-a-uuid']) {
      const res = await call(id);
      expect(res.status).toBe(404);
      expectErrorShape(res.body, 'NOT_FOUND');
    }
  });
});

describe('Delete (US-04)', () => {
  it('T10 deletes, later fetch is 404, and the history (incl. "deleted") is kept in the database', async () => {
    const task = await createTask(api, { title: 'To remove' });
    expect((await api.delete(`/api/tasks/${task.id}`)).status).toBe(204);
    expect((await api.get(`/api/tasks/${task.id}`)).status).toBe(404);
    expect((await api.delete(`/api/tasks/${task.id}`)).status).toBe(404);

    const { rows } = await db.query<{ action: string; old_value: string }>(
      'SELECT action, old_value FROM task_activities WHERE task_id = $1 ORDER BY created_at',
      [task.id],
    );
    expect(rows.map((r) => r.action)).toEqual(['created', 'deleted']);
    expect(rows[1].old_value).toBe('To remove');

    const list = await api.get('/api/tasks');
    expect(list.body.pagination.total).toBe(0);
  });
});

describe('Concurrency (F-16)', () => {
  it('T11 a stale version gets 409 CONFLICT instead of silently overwriting', async () => {
    const task = await createTask(api);
    await api.patch(`/api/tasks/${task.id}`).send({ title: 'First writer', version: 1 });

    const res = await api.patch(`/api/tasks/${task.id}`).send({ title: 'Second writer', version: 1 });
    expect(res.status).toBe(409);
    expectErrorShape(res.body, 'CONFLICT');
    expect(res.body.error.details).toMatchObject({ expectedVersion: 1, currentVersion: 2 });
    expect((await api.get(`/api/tasks/${task.id}`)).body.title).toBe('First writer');
  });

  it('T12 two simultaneous updates with the same version: exactly one wins', async () => {
    const task = await createTask(api);
    const [a, b] = await Promise.all([
      api.patch(`/api/tasks/${task.id}`).send({ status: 'in_progress', version: 1 }),
      api.patch(`/api/tasks/${task.id}`).send({ status: 'done', version: 1 }),
    ]);
    expect([a.status, b.status].sort()).toEqual([200, 409]);
    const acts = (await api.get(`/api/tasks/${task.id}/activities`)).body.data;
    expect(acts.filter((x: { action: string }) => x.action === 'status_changed')).toHaveLength(1);
  });
});

describe('Shared definition (C2 / F-06)', () => {
  it('T13 database lookup table matches the one shared status definition', async () => {
    const { rows } = await db.query<{ code: string }>('SELECT code FROM task_statuses ORDER BY position');
    expect(rows.map((r) => r.code)).toEqual(STATUSES.map((s) => s.value));
  });

  it('T14 the database itself rejects a status outside the definition (FK), even bypassing the API', async () => {
    await expect(
      db.query(`INSERT INTO tasks (title, priority, status) VALUES ('x', 'low', 'archived')`),
    ).rejects.toThrow(/foreign key/i);
  });
});
