import { createApp } from './app';
import { createDatabaseFromEnv } from './db/client';
import { migrate } from './db/migrate';

const port = Number(process.env.PORT ?? 4000);
const db = await createDatabaseFromEnv();
await migrate(db); // idempotent; keeps lookup tables in sync with the shared definition

const server = createApp(db).listen(port, () => {
  console.log(`API listening on http://localhost:${port}/api`);
});

const shutdown = async () => {
  server.close();
  await db.close();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
