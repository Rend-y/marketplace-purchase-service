import { Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';

import { observabilityConfig } from '../../../../config';
import { EventLoopMonitor } from '../../../../shared/infrastructure/system';

export interface LivenessReport {
  readonly alive: boolean;
  readonly eventLoopLagMs: number;
  readonly thresholdMs: number;
  readonly uptimeSeconds: number;
}

/**
 * Liveness deliberately checks nothing external: a database outage must not make Kubernetes
 * restart a perfectly healthy process. It only proves the event loop is still responsive.
 */
@Injectable()
export class LivenessService {
  constructor(
    private readonly eventLoop: EventLoopMonitor,
    @Inject(observabilityConfig.KEY)
    private readonly config: ConfigType<typeof observabilityConfig>,
  ) {}

  public check(): LivenessReport {
    const eventLoopLagMs = this.eventLoop.sampleLagMs();

    return {
      alive: eventLoopLagMs < this.config.eventLoopLagThresholdMs,
      eventLoopLagMs: Math.round(eventLoopLagMs),
      thresholdMs: this.config.eventLoopLagThresholdMs,
      uptimeSeconds: Math.round(process.uptime()),
    };
  }
}
