import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { RabbitMQContainer } from '@testcontainers/rabbitmq';
import type { GlobalSetupContext } from 'vitest/node';

const POSTGRES_IMAGE = 'postgres:16-alpine';
const RABBITMQ_IMAGE = 'rabbitmq:4-alpine';

declare module 'vitest' {
  export interface ProvidedContext {
    databaseUrl: string;
    amqpUrl: string;
  }
}

/**
 * Real PostgreSQL and RabbitMQ are started once for the whole integration suite.
 *
 * The behaviour under test - row locks, unique constraints, `ON CONFLICT DO NOTHING`,
 * `SKIP LOCKED` - only exists in a real database, so mocking it away would test nothing.
 * If a container fails to start, the Testcontainers reaper removes whatever did start.
 */
export default async function setup({ provide }: GlobalSetupContext): Promise<() => Promise<void>> {
  const [postgres, rabbitmq] = await Promise.all([
    new PostgreSqlContainer(POSTGRES_IMAGE).start(),
    new RabbitMQContainer(RABBITMQ_IMAGE).start(),
  ]);

  provide('databaseUrl', postgres.getConnectionUri());
  provide('amqpUrl', rabbitmq.getAmqpUrl());

  return async (): Promise<void> => {
    await rabbitmq.stop();
    await postgres.stop();
  };
}
