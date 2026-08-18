import { registerAs } from '@nestjs/config';
import { get } from 'env-var';

export const databaseConfig = registerAs('databaseConfig', () => ({
  url: get('DATABASE_URL').required().asUrlString(),
  poolSize: get('DATABASE_POOL_SIZE').default(10).asIntPositive(),
  statementTimeoutMs: get('DATABASE_STATEMENT_TIMEOUT_MS').default(5_000).asIntPositive(),
  lockTimeoutMs: get('DATABASE_LOCK_TIMEOUT_MS').default(3_000).asIntPositive(),
}));
