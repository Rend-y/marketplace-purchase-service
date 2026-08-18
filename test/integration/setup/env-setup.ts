import { inject } from 'vitest';

/**
 * Runs in every test worker before any application module is imported, so the config layer sees
 * a fully populated environment and points at the throwaway containers from `global-setup.ts`.
 */
const TEST_ENV: Record<string, string> = {
  NODE_ENV: 'test',
  APP_HOST: '127.0.0.1',
  APP_PORT: '3000',
  SWAGGER_ENABLED: 'false',
  LOG_LEVEL: 'silent',
  LOG_PRETTY: 'false',
  // Generous limits: the concurrency suites deliberately queue many requests on the same row lock.
  DATABASE_POOL_SIZE: '25',
  DATABASE_STATEMENT_TIMEOUT_MS: '20000',
  DATABASE_LOCK_TIMEOUT_MS: '15000',
  RABBITMQ_EXCHANGE: 'marketplace.events',
  RABBITMQ_PUBLISH_TIMEOUT_MS: '5000',
  // The relay is driven explicitly by the tests, so background polling is kept out of the way.
  OUTBOX_POLL_INTERVAL_MS: '3600000',
  OUTBOX_BATCH_SIZE: '50',
  OUTBOX_MAX_ATTEMPTS: '5',
  EVENT_LOOP_LAG_THRESHOLD_MS: '5000',
};

for (const [key, value] of Object.entries(TEST_ENV)) {
  process.env[key] = value;
}

process.env.DATABASE_URL = inject('databaseUrl');
process.env.RABBITMQ_URL = inject('amqpUrl');
