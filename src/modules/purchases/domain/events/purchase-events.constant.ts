export const PURCHASE_AGGREGATE_TYPE = 'purchase';

export const PURCHASE_EVENT_TYPE = {
  PURCHASE_COMPLETED: 'purchase.completed',
} as const;

export type PurchaseEventType = (typeof PURCHASE_EVENT_TYPE)[keyof typeof PURCHASE_EVENT_TYPE];

export const PURCHASE_EVENT_VERSION = 1;
