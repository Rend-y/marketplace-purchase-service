export interface CreatePurchaseCommand {
  readonly productId: string;
  readonly buyerId: string;
  readonly idempotencyKey: string;
}
