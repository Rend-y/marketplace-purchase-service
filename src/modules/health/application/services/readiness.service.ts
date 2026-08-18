import { Inject, Injectable } from '@nestjs/common';

import { ApplicationStateService } from '../../../../shared/infrastructure/system';
import { HEALTH_STATUS, type HealthCheckResult, type HealthIndicatorPort } from '../ports';

export const HEALTH_INDICATORS = 'HealthIndicators';

export interface ReadinessReport {
  readonly ready: boolean;
  readonly checks: readonly HealthCheckResult[];
}

/**
 * Readiness answers "can this instance serve traffic right now": every critical dependency must
 * be reachable, and the process must not be draining for shutdown.
 */
@Injectable()
export class ReadinessService {
  constructor(
    @Inject(HEALTH_INDICATORS) private readonly indicators: readonly HealthIndicatorPort[],
    private readonly applicationState: ApplicationStateService,
  ) {}

  public async check(): Promise<ReadinessReport> {
    const checks = await Promise.all(this.indicators.map((indicator) => indicator.check()));

    const shutdownCheck: HealthCheckResult = {
      name: 'shutdown',
      status: this.applicationState.isAcceptingTraffic() ? HEALTH_STATUS.UP : HEALTH_STATUS.DOWN,
      ...(this.applicationState.isShuttingDown() ? { detail: 'application is shutting down' } : {}),
    };

    const allChecks = [...checks, shutdownCheck];

    return {
      ready: allChecks.every((check) => check.status === HEALTH_STATUS.UP),
      checks: allChecks,
    };
  }
}
