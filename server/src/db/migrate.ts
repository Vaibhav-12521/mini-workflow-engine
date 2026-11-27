import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { PRIORITIES, STATUSES } from '@mwe/shared';
import type { Database } from './client';

const sqlPath = (name: string) => fileURLToPath(new URL(`../../../db/${name}`, import.meta.url));

export async function migrate(db: Database): Promise<void> {
  await db.exec(await readFile(sqlPath('schema.sql'), 'utf8'));

  await db.transaction(async (tx) => {
    for (const [position, s] of STATUSES.entries()) {
      await tx.query(
        `INSERT INTO task_statuses (code, label, position) VALUES ($1, $2, $3)
         ON CONFLICT (code) DO UPDATE SET label = EXCLUDED.label, position = EXCLUDED.position`,
        [s.value, s.label, position],
      );
    }
    for (const [rank, p] of PRIORITIES.entries()) {
      await tx.query(
        `INSERT INTO task_priorities (code, label, rank) VALUES ($1, $2, $3)
         ON CONFLICT (code) DO UPDATE SET label = EXCLUDED.label, rank = EXCLUDED.rank`,
        [p.value, p.label, rank],
      );
    }
    await tx.query(
      `DELETE FROM task_statuses s WHERE NOT (s.code = ANY($1::text[]))
         AND NOT EXISTS (SELECT 1 FROM tasks t WHERE t.status = s.code)`,
      [STATUSES.map((s) => s.value)],
    );
    await tx.query(
      `DELETE FROM task_priorities p WHERE NOT (p.code = ANY($1::text[]))
         AND NOT EXISTS (SELECT 1 FROM tasks t WHERE t.priority = p.code)`,
      [PRIORITIES.map((p) => p.value)],
    );
  });
}

export async function seed(db: Database): Promise<void> {
  await db.exec(await readFile(sqlPath('seed.sql'), 'utf8'));
}

export async function reset(db: Database): Promise<void> {
  await db.exec(
    'DROP TABLE IF EXISTS task_activities, tasks, task_statuses, task_priorities CASCADE;',
  );
}
