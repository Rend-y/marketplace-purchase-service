import { Inject, Injectable } from '@nestjs/common';

import type { MessagePublisherPort } from '../../../../shared/application/ports';
import { INJECTION_TOKEN } from '../../../../shared/constants';
import {
  HEALTH_STATUS,
  type HealthCheckResult,
  type HealthIndicatorPort,
} from '../../application/ports';

@Injectable()
export class BrokerHealthIndicator implements HealthIndicatorPort {
  public readonly name = 'broker';

  constructor(
    @Inject(INJECTION_TOKEN.MESSAGE_PUBLISHER) private readonly publisher: MessagePublisherPort,
  ) {}

  public check(): Promise<HealthCheckResult> {
    const connected = this.publisher.isConnected();

    return Promise.resolve({
      name: this.name,
      status: connected ? HEALTH_STATUS.UP : HEALTH_STATUS.DOWN,
      ...(connected ? {} : { detail: 'no active RabbitMQ connection' }),
    });
  }
}
