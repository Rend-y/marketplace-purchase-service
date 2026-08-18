import type { PurchaseView } from './purchase-view';

export interface CreatePurchaseResult {
  readonly purchase: PurchaseView;
  /** True when the response was served from a previously stored idempotent result. */
  readonly replayed: boolean;
}
