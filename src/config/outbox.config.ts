import { registerAs } from '@nestjs/config';
import { get } from 'env-var';

export const outboxConfig = registerAs('outboxConfig', () => ({
  pollIntervalMs: get('OUTBOX_POLL_INTERVAL_MS').default(1_000).asIntPositive(),
  batchSize: get('OUTBOX_BATCH_SIZE').default(50).asIntPositive(),
  maxAttempts: get('OUTBOX_MAX_ATTEMPTS').default(10).asIntPositive(),
}));
