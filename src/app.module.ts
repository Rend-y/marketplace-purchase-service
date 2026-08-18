import { Module } from '@nestjs/common';

import { AppConfigModule } from './config';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './modules/health/health.module';
import { ObservabilityModule } from './modules/observability/observability.module';
import { PurchasesModule } from './modules/purchases/purchases.module';
import { RequestContextModule } from './shared/infrastructure/context/request-context.module';
import { LoggerModule } from './shared/infrastructure/logger';
import { MessagingModule } from './shared/infrastructure/messaging';
import { MetricsModule } from './shared/infrastructure/metrics';
import { OutboxModule } from './shared/infrastructure/outbox';
import { SystemModule } from './shared/infrastructure/system';

/**
 * Import order matters for middleware: the CLS middleware must run before pino's, so the
 * request id generated from `x-request-id` is the one that ends up in every log line.
 */
@Module({
  imports: [
    AppConfigModule,
    RequestContextModule,
    LoggerModule,
    MetricsModule,
    SystemModule,
    DatabaseModule,
    MessagingModule,
    OutboxModule,
    PurchasesModule,
    HealthModule,
    ObservabilityModule,
  ],
})
export class AppModule {}
