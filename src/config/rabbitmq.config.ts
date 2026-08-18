import { registerAs } from '@nestjs/config';
import { get } from 'env-var';

export const rabbitmqConfig = registerAs('rabbitmqConfig', () => ({
  url: get('RABBITMQ_URL').required().asUrlString(),
  exchange: get('RABBITMQ_EXCHANGE').default('marketplace.events').asString(),
  publishTimeoutMs: get('RABBITMQ_PUBLISH_TIMEOUT_MS').default(5_000).asIntPositive(),
}));
