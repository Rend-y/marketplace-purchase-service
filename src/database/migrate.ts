import 'dotenv/config';

import { createDataSource } from './data-source';

const run = async (): Promise<void> => {
  const dataSource = createDataSource();
  await dataSource.initialize();

  try {
    const applied = await dataSource.runMigrations({ transaction: 'all' });

    for (const migration of applied) {
      process.stdout.write(`applied migration: ${migration.name}\n`);
    }

    if (applied.length === 0) {
      process.stdout.write('database schema is already up to date\n');
    }
  } finally {
    await dataSource.destroy();
  }
};

run().catch((error: unknown) => {
  console.error('migration failed', error);
  process.exitCode = 1;
});
