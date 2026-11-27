import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Database } from '../src/db/client';
import { createTask, setupTestApp, truncate } from './helpers';

let db: Database;
let api: Awaited<ReturnType<typeof setupTestApp>>['api'];

beforeAll(async () => {
  ({ db, api } = await setupTestApp());
  await db.exec(`
    CREATE OR REPLACE FUNCTION fail_activity_insert() RETURNS trigger AS $$
    BEGIN RAISE EXCEPTION 'simulated activity write failure'; END;
    $$ LANGUAGE plpgsql;
  `);
});
afterAll(() => db.close());
beforeEach(async () => {
  await db.exec('DROP TRIGGER IF EXISTS break_activities ON task_activities;');
  await truncate(db);
});

const breakActivityWrites = () =>
  db.exec(`CREATE TRIGGER break_activities BEFORE INSERT ON task_activities
           FOR EACH ROW EXECUTE FUNCTION fail_activity_insert();`);

describe('Transaction rollback (US-10 / F-13)', () => {
  it('T15 create: no task row is left behind when the activity insert fails', async () => {
    await breakActivityWrites();
    const res = await api.post('/api/tasks').send({ title: 'Should not persist' });

    expect(res.status).toBe(500);
    expect(res.body.error).toMatchObject({ code: 'INTERNAL' });
    expect(JSON.stringify(res.body)).not.toMatch(/simulated|exception|sql/i);
    const { rows } = await db.query('SELECT 1 FROM tasks');
    expect(rows).toHaveLength(0);
  });

  it('T16 update: the task keeps its old values and version when the activity insert fails', async () => {
    const task = await createTask(api, { title: 'Original', priority: 'low' });
    await breakActivityWrites();

    const res = await api.patch(`/api/tasks/${task.id}`).send({ title: 'Changed', status: 'done', version: 1 });
    expect(res.status).toBe(500);

    const { rows } = await db.query<{ title: string; status: string; version: number }>(
      'SELECT title, status, version FROM tasks WHERE id = $1',
      [task.id],
    );
    expect(rows[0]).toEqual({ title: 'Original', status: 'todo', version: 1 });
  });

  it('T17 delete: the task is still live when the "deleted" activity insert fails', async () => {
    const task = await createTask(api);
    await breakActivityWrites();

    expect((await api.delete(`/api/tasks/${task.id}`)).status).toBe(500);
    await db.exec('DROP TRIGGER break_activities ON task_activities;');
    expect((await api.get(`/api/tasks/${task.id}`)).status).toBe(200);
  });
});
