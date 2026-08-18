import {
  Injectable,
  Logger,
  type BeforeApplicationShutdown,
  type OnApplicationBootstrap,
} from '@nestjs/common';

/**
 * Tracks whether the process should be receiving traffic.
 *
 * The flag flips on `beforeApplicationShutdown`, so readiness starts failing while in-flight
 * requests are still being served: the orchestrator removes the pod from the load balancer
 * before the HTTP server actually closes.
 */
@Injectable()
export class ApplicationStateService implements OnApplicationBootstrap, BeforeApplicationShutdown {
  private readonly logger = new Logger(ApplicationStateService.name);

  private started = false;
  private shuttingDown = false;

  public onApplicationBootstrap(): void {
    this.started = true;
  }

  public beforeApplicationShutdown(signal?: string): void {
    this.shuttingDown = true;
    this.logger.log({ message: 'Shutdown initiated, readiness will report unavailable', signal });
  }

  public isAcceptingTraffic(): boolean {
    return this.started && !this.shuttingDown;
  }

  public isShuttingDown(): boolean {
    return this.shuttingDown;
  }
}
