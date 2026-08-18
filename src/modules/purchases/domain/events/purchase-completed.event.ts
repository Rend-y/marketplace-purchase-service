import type { JsonObject } from '../../../../shared/types';
import type { Purchase } from '../entities';
import {
  PURCHASE_EVENT_TYPE,
  PURCHASE_EVENT_VERSION,
  type PurchaseEventType,
} from './purchase-events.constant';

export interface PurchaseCompletedEventParams {
  readonly eventId: string;
  readonly purchase: Purchase;
  readonly occurredAt: Date;
}

/**
 * Integration event published to RabbitMQ after the purchase transaction has committed.
 * The wire contract is versioned and owned by the domain, not by the broker adapter.
 */
export class PurchaseCompletedEvent {
  public readonly eventType: PurchaseEventType = PURCHASE_EVENT_TYPE.PURCHASE_COMPLETED;
  public readonly eventVersion = PURCHASE_EVENT_VERSION;

  private constructor(
    public readonly eventId: string,
    public readonly purchase: Purchase,
    public readonly occurredAt: Date,
  ) {}

  public static from(params: PurchaseCompletedEventParams): PurchaseCompletedEvent {
    return new PurchaseCompletedEvent(params.eventId, params.purchase, params.occurredAt);
  }

  public get aggregateId(): string {
    return this.purchase.id;
  }

  public toPayload(): JsonObject {
    return {
      eventId: this.eventId,
      eventType: this.eventType,
      eventVersion: this.eventVersion,
      occurredAt: this.occurredAt.toISOString(),
      data: {
        purchaseId: this.purchase.id,
        productId: this.purchase.productId,
        buyerId: this.purchase.buyerId,
        sellerId: this.purchase.sellerId,
        amount: {
          minorUnits: this.purchase.amount.minorUnits,
          currency: this.purchase.amount.currency,
        },
        purchasedAt: this.purchase.purchasedAt.toISOString(),
      },
    };
  }
}
