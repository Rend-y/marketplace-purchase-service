import type { JsonObject } from '../../types';

export interface OutboxMessageToEnqueue {
  readonly id: string;
  readonly aggregateType: string;
  readonly aggregateId: string;
  readonly eventType: string;
  readonly payload: JsonObject;
  readonly occurredAt: Date;
}

export interface OutboxMessageRecord extends OutboxMessageToEnqueue {
  readonly attempts: number;
}

export interface OutboxRepositoryPort {
  /** Written inside the business transaction: the event cannot be lost or published twice. */
  enqueue(message: OutboxMessageToEnqueue): Promise<void>;

  /**
   * Claims a batch of unpublished messages with `FOR UPDATE SKIP LOCKED`, so several
   * application instances can drain the outbox concurrently without conflicting.
   */
  lockBatchForPublishing(limit: number, maxAttempts: number): Promise<OutboxMessageRecord[]>;

  markPublished(messageId: string, publishedAt: Date): Promise<void>;

  markFailed(messageId: string, error: string): Promise<void>;

  countPending(maxAttempts: number): Promise<number>;
}
