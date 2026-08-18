import {
  Injectable,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { monitorEventLoopDelay, type IntervalHistogram } from 'node:perf_hooks';

const RESOLUTION_MS = 20;
const NANOSECONDS_IN_MILLISECOND = 1e6;
const P99 = 99;

/**
 * Liveness signal: a process whose event loop is blocked for seconds is not alive in any useful
 * sense, even though the socket still accepts connections.
 */
@Injectable()
export class EventLoopMonitor implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly histogram: IntervalHistogram = monitorEventLoopDelay({
    resolution: RESOLUTION_MS,
  });

  public onApplicationBootstrap(): void {
    this.histogram.enable();
  }

  public onApplicationShutdown(): void {
    this.histogram.disable();
  }

  /** Returns the p99 delay observed since the previous call and starts a new window. */
  public sampleLagMs(): number {
    const lagMs = this.histogram.percentile(P99) / NANOSECONDS_IN_MILLISECOND;
    this.histogram.reset();

    return Number.isFinite(lagMs) ? lagMs : 0;
  }
}
