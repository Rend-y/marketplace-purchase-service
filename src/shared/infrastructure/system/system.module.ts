import { Global, Module } from '@nestjs/common';

import { INJECTION_TOKEN } from '../../constants';
import { ApplicationStateService } from './application-state.service';
import { EventLoopMonitor } from './event-loop.monitor';
import { SystemClock } from './system-clock';
import { UuidV4Generator } from './uuid-v4.generator';

@Global()
@Module({
  providers: [
    ApplicationStateService,
    EventLoopMonitor,
    { provide: INJECTION_TOKEN.CLOCK, useClass: SystemClock },
    { provide: INJECTION_TOKEN.UUID_GENERATOR, useClass: UuidV4Generator },
  ],
  exports: [
    ApplicationStateService,
    EventLoopMonitor,
    INJECTION_TOKEN.CLOCK,
    INJECTION_TOKEN.UUID_GENERATOR,
  ],
})
export class SystemModule {}
