import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Database } from '../src/db/client';
import { createTask, setupTestApp, truncate } from './helpers';

let db: Database;
let api: Awaited<ReturnType<typeof setupTestApp>>['api'];

beforeAll(async () => {
  ({ db, api } = await setupTestApp());
  await truncate(db);
  const fixtures: Array<[string, string, string, string]> = [
    ['Fix login bug', 'Users cannot log in on Safari', 'high', 'todo'],
    ['Write docs', 'API reference for the reports bug fix', 'low', 'done'],
    ['Plan sprint', 'Pick stories for next week', 'medium', 'in_progress'],
    ['Discount 50% banner', 'Homepage banner', 'medium', 'todo'],
    ['Deploy hotfix', 'Bug in payments', 'high', 'in_progress'],
  ];
  for (const [title, description, priority, status] of fixtures) {
    await createTask(api, { title, description, priority, status });
  }
});
afterAll(() => db.close());

const titles = (body: { data: Array<{ title: string }> }) => body.data.map((t) => t.title);

describe('List, filter, search, paginate, sort — all in SQL (US-06, US-07)', () => {
  it('T18 filters by status and by priority, and combines them', async () => {
    expect(titles((await api.get('/api/tasks?status=todo')).body).sort()).toEqual(['Discount 50% banner', 'Fix login bug']);
    expect(titles((await api.get('/api/tasks?priority=high')).body).sort()).toEqual(['Deploy hotfix', 'Fix login bug']);
    expect(titles((await api.get('/api/tasks?status=in_progress&priority=high')).body)).toEqual(['Deploy hotfix']);
  });

  it('T19 searches title OR description (case-insensitive) and combines with filters', async () => {
    const all = await api.get('/api/tasks?q=BUG');
    expect(titles(all.body).sort()).toEqual(['Deploy hotfix', 'Fix login bug', 'Write docs']);
    const filtered = await api.get('/api/tasks?q=bug&priority=high&status=todo');
    expect(titles(filtered.body)).toEqual(['Fix login bug']);
  });

  it('T20 treats % and _ in the search text literally', async () => {
    expect(titles((await api.get('/api/tasks?q=50%25')).body)).toEqual(['Discount 50% banner']);
    expect((await api.get('/api/tasks?q=%25')).body.data).toHaveLength(1);
  });

  it('T21 paginates with correct totals and no overlap between pages', async () => {
    const p1 = (await api.get('/api/tasks?pageSize=2&page=1')).body;
    const p3 = (await api.get('/api/tasks?pageSize=2&page=3')).body;
    expect(p1.pagination).toEqual({ page: 1, pageSize: 2, total: 5, totalPages: 3 });
    expect(p1.data).toHaveLength(2);
    expect(p3.data).toHaveLength(1);
    const p2 = (await api.get('/api/tasks?pageSize=2&page=2')).body;
    const ids = [...p1.data, ...p2.data, ...p3.data].map((t: { id: string }) => t.id);
    expect(new Set(ids).size).toBe(5);
  });

  it('T22 sorts priority by rank (Low < Medium < High), not alphabetically', async () => {
    const res = await api.get('/api/tasks?sort=priority&order=asc');
    expect(res.body.data.map((t: { priority: string }) => t.priority)).toEqual(['low', 'medium', 'medium', 'high', 'high']);
  });

  it('T23 rejects bad query params with 422 (unknown status, pageSize over max, unknown sort)', async () => {
    for (const qs of ['status=archived', 'pageSize=500', 'sort=password', 'page=0']) {
      const res = await api.get(`/api/tasks?${qs}`);
      expect(res.status, qs).toBe(422);
      expect(res.body.error.code).toBe('VALIDATION_FAILED');
    }
  });

  it('T24 empty filters are ignored (the UI sends "" for "Any")', async () => {
    const res = await api.get('/api/tasks?status=&priority=&q=');
    expect(res.body.pagination.total).toBe(5);
  });
});
