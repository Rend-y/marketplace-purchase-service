import { Module } from '@nestjs/common';

import { HEALTH_INDICATORS, LivenessService, ReadinessService } from './application/services';
import { BrokerHealthIndicator, DatabaseHealthIndicator } from './infrastructure/indicators';
import { HealthController } from './presentation/health.controller';

@Module({
  controllers: [HealthController],
  providers: [
    DatabaseHealthIndicator,
    BrokerHealthIndicator,
    ReadinessService,
    LivenessService,
    {
      provide: HEALTH_INDICATORS,
      inject: [DatabaseHealthIndicator, BrokerHealthIndicator],
      useFactory: (
        database: DatabaseHealthIndicator,
        broker: BrokerHealthIndicator,
      ): readonly [DatabaseHealthIndicator, BrokerHealthIndicator] => [database, broker],
    },
  ],
})
export class HealthModule {}
