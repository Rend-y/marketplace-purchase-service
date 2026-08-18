import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { appConfig } from './app.config';
import { databaseConfig } from './database.config';
import { loggerConfig } from './logger.config';
import { observabilityConfig } from './observability.config';
import { outboxConfig } from './outbox.config';
import { rabbitmqConfig } from './rabbitmq.config';

/**
 * Config factories run eagerly on registration, so a missing or malformed variable fails the
 * boot instead of surfacing later at the first request.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: ['.env'],
      load: [
        appConfig,
        databaseConfig,
        rabbitmqConfig,
        loggerConfig,
        outboxConfig,
        observabilityConfig,
      ],
    }),
  ],
})
export class AppConfigModule {}
