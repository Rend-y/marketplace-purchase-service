import { DataSource, type DataSourceOptions } from 'typeorm';

import { databaseConfig } from '../config';
import {
  AccountOrmEntity,
  IdempotencyKeyOrmEntity,
  LedgerEntryOrmEntity,
  ProductOrmEntity,
  PurchaseOrmEntity,
  UserOrmEntity,
} from '../modules/purchases/infrastructure/persistence/entities';
import { OutboxMessageOrmEntity } from '../shared/infrastructure/outbox/outbox-message.orm-entity';
import { InitialSchema1755500000000 } from './migrations/1755500000000-InitialSchema';

/**
 * Entities and migrations are listed explicitly instead of being globbed, so the same set is
 * loaded from `src` during development and from `dist` inside the container.
 */
const ENTITIES = [
  UserOrmEntity,
  AccountOrmEntity,
  ProductOrmEntity,
  PurchaseOrmEntity,
  LedgerEntryOrmEntity,
  IdempotencyKeyOrmEntity,
  OutboxMessageOrmEntity,
];

const MIGRATIONS = [InitialSchema1755500000000];

export const buildDataSourceOptions = (
  config: ReturnType<typeof databaseConfig>,
): DataSourceOptions => ({
  type: 'postgres',
  url: config.url,
  entities: ENTITIES,
  migrations: MIGRATIONS,
  migrationsTableName: 'typeorm_migrations',
  // Schema changes go through migrations only; an implicit sync would be unsafe in production.
  synchronize: false,
  logging: ['error', 'warn'],
  extra: {
    max: config.poolSize,
    statement_timeout: config.statementTimeoutMs,
    application_name: 'purchase-service',
    // Bounds how long a request may wait on `SELECT ... FOR UPDATE` before failing fast.
    options: `-c lock_timeout=${String(config.lockTimeoutMs)}`,
  },
});

/**
 * For the standalone scripts (migrations, seed) that run without Nest.
 * They must load `dotenv/config` before calling this.
 */
export const createDataSource = (): DataSource =>
  new DataSource(buildDataSourceOptions(databaseConfig()));
