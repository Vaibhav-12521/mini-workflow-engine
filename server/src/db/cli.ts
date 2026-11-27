import { createDatabaseFromEnv } from './client';
import { migrate, reset, seed } from './migrate';

const command = process.argv[2];
const db = await createDatabaseFromEnv();

try {
  if (command === 'migrate') {
    await migrate(db);
    console.log('✔ schema applied, lookup tables synced');
  } else if (command === 'seed') {
    await migrate(db);
    if (process.env.SEED_ENABLED === 'false') {
      console.log('SEED_ENABLED=false, skipping seed');
    } else {
      await seed(db);
      console.log('✔ synthetic seed data loaded (idempotent)');
    }
  } else if (command === 'reset') {
    await reset(db);
    await migrate(db);
    await seed(db);
    console.log('✔ database dropped, migrated and re-seeded');
  } else {
    console.error('Usage: cli.ts <migrate|seed|reset>');
    process.exitCode = 1;
  }
} finally {
  await db.close();
}
