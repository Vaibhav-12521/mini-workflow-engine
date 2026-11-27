import { PGlite } from '@electric-sql/pglite';
import pg from 'pg';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export interface Queryable {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<{ rows: T[]; rowCount: number }>;
}

export interface Database extends Queryable {
  transaction<T>(fn: (tx: Queryable) => Promise<T>): Promise<T>;
  exec(sql: string): Promise<void>;
  close(): Promise<void>;
}

function fromPglite(db: PGlite): Database {
  const wrap = (q: Pick<PGlite, 'query'>): Queryable => ({
    async query<T>(sql: string, params: unknown[] = []) {
      const res = await q.query<T>(sql, params);
      return { rows: res.rows, rowCount: res.affectedRows ?? res.rows.length };
    },
  });
  return {
    ...wrap(db),
    transaction: (fn) => db.transaction((tx) => fn(wrap(tx))),
    exec: async (sql) => {
      await db.exec(sql);
    },
    close: () => db.close(),
  };
}

function fromPgPool(pool: pg.Pool): Database {
  const wrap = (q: pg.Pool | pg.PoolClient): Queryable => ({
    async query<T>(sql: string, params: unknown[] = []) {
      const res = await q.query(sql, params);
      return { rows: res.rows as T[], rowCount: res.rowCount ?? 0 };
    },
  });
  return {
    ...wrap(pool),
    async transaction(fn) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const result = await fn(wrap(client));
        await client.query('COMMIT');
        return result;
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    },
    exec: async (sql) => {
      await pool.query(sql);
    },
    close: () => pool.end(),
  };
}

export interface DbOptions {
  url?: string;
  dataDir?: string;
}

export async function createDatabase(opts: DbOptions = {}): Promise<Database> {
  if (opts.url) return fromPgPool(new pg.Pool({ connectionString: opts.url }));
  if (opts.dataDir) mkdirSync(opts.dataDir, { recursive: true });
  const db = opts.dataDir ? new PGlite(opts.dataDir) : new PGlite();
  await db.waitReady;
  return fromPglite(db);
}

export function createDatabaseFromEnv(): Promise<Database> {
  return createDatabase({
    url: process.env.DATABASE_URL || undefined,
    dataDir: process.env.PGLITE_DATA_DIR || fileURLToPath(new URL('../../../data/pgdata', import.meta.url)),
  });
}
