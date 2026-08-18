import type { JsonObject } from '../../types';

export interface OutboundMessage {
  readonly messageId: string;
  readonly type: string;
  readonly routingKey: string;
  readonly occurredAt: Date;
  readonly payload: JsonObject;
}

export interface MessagePublisherPort {
  /** Publishes with publisher confirms; rejects if the broker did not acknowledge. */
  publish(message: OutboundMessage): Promise<void>;
  isConnected(): boolean;
}
