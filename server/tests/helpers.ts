import request from 'supertest';
import { createApp } from '../src/app';
import { createDatabase, type Database } from '../src/db/client';
import { migrate } from '../src/db/migrate';

export async function setupTestApp() {
  const db = await createDatabase();
  await migrate(db);
  const app = createApp(db);
  return { db, api: request(app) };
}

export async function truncate(db: Database) {
  await db.exec('TRUNCATE task_activities, tasks CASCADE;');
}

export async function createTask(api: ReturnType<typeof request>, body: Record<string, unknown> = {}) {
  const res = await api.post('/api/tasks').send({ title: 'Test task', ...body });
  if (res.status !== 201) throw new Error(`create failed: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body as { id: string; version: number; [k: string]: unknown };
}
