import type { JsonObject, JsonValue } from '../../../../shared/types';
import type { Purchase } from '../../domain';
import { CorruptedIdempotentResultError } from '../errors';

/**
 * Canonical representation of a completed purchase produced by the application layer.
 *
 * It is also what gets stored in the idempotency record, so a replayed request is byte-for-byte
 * identical to the original response without persisting an HTTP-shaped payload.
 */
export interface PurchaseView {
  readonly id: string;
  readonly productId: string;
  readonly buyerId: string;
  readonly sellerId: string;
  readonly amountMinorUnits: number;
  readonly currency: string;
  readonly purchasedAt: string;
}

type PurchaseViewField = keyof PurchaseView;

export const toPurchaseView = (purchase: Purchase): PurchaseView => ({
  id: purchase.id,
  productId: purchase.productId,
  buyerId: purchase.buyerId,
  sellerId: purchase.sellerId,
  amountMinorUnits: purchase.amount.minorUnits,
  currency: purchase.amount.currency,
  purchasedAt: purchase.purchasedAt.toISOString(),
});

export const purchaseViewToJson = (view: PurchaseView): JsonObject => ({ ...view });

const readString = (source: JsonObject, field: PurchaseViewField): string => {
  const value: JsonValue | undefined = source[field];

  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new CorruptedIdempotentResultError(field, 'expected a non-empty string');
  }

  return value;
};

const readAmount = (source: JsonObject, field: PurchaseViewField): number => {
  const value: JsonValue | undefined = source[field];

  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    throw new CorruptedIdempotentResultError(field, 'expected a non-negative safe integer');
  }

  return value;
};

/**
 * Validates the payload read back from `idempotency_keys.result`.
 *
 * The row was written by this service, so this is an integrity check rather than input
 * validation: a mismatch means the stored contract drifted and must not be replayed silently.
 */
export const parsePurchaseView = (value: JsonObject): PurchaseView => ({
  id: readString(value, 'id'),
  productId: readString(value, 'productId'),
  buyerId: readString(value, 'buyerId'),
  sellerId: readString(value, 'sellerId'),
  amountMinorUnits: readAmount(value, 'amountMinorUnits'),
  currency: readString(value, 'currency'),
  purchasedAt: readString(value, 'purchasedAt'),
});
