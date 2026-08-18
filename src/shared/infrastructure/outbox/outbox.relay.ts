import {
  Inject,
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigType } from '@nestjs/config';

import { outboxConfig } from '../../../config';
import { INJECTION_TOKEN } from '../../constants';
import type {
  MessagePublisherPort,
  OutboxMessageRecord,
  OutboxRepositoryPort,
  TransactionManagerPort,
} from '../../application/ports';
import { MetricsService } from '../metrics';
import { serializeError } from '../logger';

/**
 * Transactional outbox relay.
 *
 * The purchase transaction only appends an event row; this worker is the single component that
 * talks to the broker. That removes the dual-write problem entirely: there is no window in which
 * money has moved but the event was lost, or an event was published for a rolled back purchase.
 *
 * Delivery is at-least-once (the broker may acknowledge a message whose transaction then fails to
 * commit), so consumers must deduplicate by `eventId`.
 */
@Injectable()
export class OutboxRelay implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(OutboxRelay.name);

  private timer?: NodeJS.Timeout;
  private currentTick?: Promise<void>;
  private stopped = false;

  constructor(
    @Inject(outboxConfig.KEY) private readonly config: ConfigType<typeof outboxConfig>,
    @Inject(INJECTION_TOKEN.TRANSACTION_MANAGER)
    private readonly transactionManager: TransactionManagerPort,
    @Inject(INJECTION_TOKEN.OUTBOX_REPOSITORY) private readonly outbox: OutboxRepositoryPort,
    @Inject(INJECTION_TOKEN.MESSAGE_PUBLISHER) private readonly publisher: MessagePublisherPort,
    private readonly metrics: MetricsService,
  ) {}

  public onApplicationBootstrap(): void {
    // The first tick is delayed by a full interval so the relay never races the schema migration.
    this.scheduleNextTick(this.config.pollIntervalMs);
    this.logger.log({
      message: 'Outbox relay started',
      pollIntervalMs: this.config.pollIntervalMs,
    });
  }

  public async onApplicationShutdown(): Promise<void> {
    this.stopped = true;

    if (this.timer !== undefined) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }

    // Let an in-flight batch finish so no message is left half-processed.
    await this.currentTick;
    this.logger.log({ message: 'Outbox relay stopped' });
  }

  /** Exposed for integration tests that need a deterministic drain instead of waiting for a tick. */
  public async drainOnce(): Promise<number> {
    return this.publishBatch();
  }

  private scheduleNextTick(delayMs: number): void {
    if (this.stopped) {
      return;
    }

    this.timer = setTimeout(() => {
      this.currentTick = this.runTick().finally(() => {
        this.scheduleNextTick(this.config.pollIntervalMs);
      });
    }, delayMs);

    this.timer.unref();
  }

  private async runTick(): Promise<void> {
    if (!this.publisher.isConnected()) {
      return;
    }

    try {
      await this.publishBatch();
      this.metrics.setOutboxPending(await this.outbox.countPending(this.config.maxAttempts));
    } catch (error: unknown) {
      this.logger.error({
        message: 'Outbox relay tick failed',
        err: serializeError(error),
      });
    }
  }

  private async publishBatch(): Promise<number> {
    return this.transactionManager.runInTransaction(async () => {
      const messages = await this.outbox.lockBatchForPublishing(
        this.config.batchSize,
        this.config.maxAttempts,
      );

      let published = 0;

      for (const message of messages) {
        const success = await this.publishOne(message);

        if (success) {
          published += 1;
        }
      }

      return published;
    });
  }

  private async publishOne(message: OutboxMessageRecord): Promise<boolean> {
    try {
      await this.publisher.publish({
        messageId: message.id,
        type: message.eventType,
        routingKey: message.eventType,
        occurredAt: message.occurredAt,
        payload: message.payload,
      });

      await this.outbox.markPublished(message.id, new Date());
      this.metrics.recordOutboxPublished(message.eventType);

      return true;
    } catch (error: unknown) {
      const serialized = serializeError(error);

      await this.outbox.markFailed(message.id, serialized.message);
      this.metrics.recordOutboxPublishFailure(message.eventType);

      this.logger.error({
        message: 'Failed to publish an outbox message',
        outboxMessageId: message.id,
        eventType: message.eventType,
        attempts: message.attempts + 1,
        err: serialized,
      });

      return false;
    }
  }
}
