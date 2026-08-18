import { registerAs } from '@nestjs/config';
import { get } from 'env-var';

export const loggerConfig = registerAs('loggerConfig', () => ({
  level: get('LOG_LEVEL')
    .default('info')
    .asEnum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']),
  pretty: get('LOG_PRETTY').default('false').asBool(),
}));
