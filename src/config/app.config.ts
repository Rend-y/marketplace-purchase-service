import { registerAs } from '@nestjs/config';
import { get } from 'env-var';

export const appConfig = registerAs('appConfig', () => ({
  nodeEnv: get('NODE_ENV').default('development').asEnum(['development', 'test', 'production']),
  host: get('APP_HOST').default('0.0.0.0').asString(),
  port: get('APP_PORT').default(3000).asPortNumber(),
  shutdownTimeoutMs: get('APP_SHUTDOWN_TIMEOUT_MS').default(10_000).asIntPositive(),
  swaggerEnabled: get('SWAGGER_ENABLED').default('true').asBool(),
  swaggerPath: get('SWAGGER_PATH').default('docs').asString(),
}));
