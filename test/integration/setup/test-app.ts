import { Logger, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';

import { AppModule } from '../../../src/app.module';
import { setupApp } from '../../../src/bootstrap';
import { OutboxRelay } from '../../../src/shared/infrastructure/outbox';

export interface TestApp {
  readonly app: INestApplication;
  readonly dataSource: DataSource;
  readonly outboxRelay: OutboxRelay;
  readonly close: () => Promise<void>;
}

/**
 * Boots the real application with the same global pipes, interceptors and filters as production,
 * pointed at the throwaway containers configured in `env-setup.ts`. Nothing is stubbed.
 */
export const createTestApp = async (): Promise<TestApp> => {
  Logger.overrideLogger(false);

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication();

  setupApp(app);
  await app.init();

  const dataSource = app.get(DataSource);
  await dataSource.runMigrations({ transaction: 'all' });

  return {
    app,
    dataSource,
    outboxRelay: app.get(OutboxRelay),
    close: async (): Promise<void> => {
      await app.close();
    },
  };
};
