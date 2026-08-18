import { describe, expect, it } from 'vitest';

import { Money } from '../../../../shared/domain/value-objects';
import type { JsonObject } from '../../../../shared/types';
import { Purchase } from '../../domain';
import { CorruptedIdempotentResultError } from '../errors';
import { parsePurchaseView, purchaseViewToJson, toPurchaseView } from './purchase-view';

const PURCHASED_AT = new Date('2026-08-18T10:15:30.123Z');

const VALID_VIEW: JsonObject = {
  id: 'b6f0e6a4-1b3c-4f2a-9c1d-2e3f4a5b6c7d',
  productId: 'c7f0e6a4-1b3c-4f2a-9c1d-2e3f4a5b6c7d',
  buyerId: 'd8f0e6a4-1b3c-4f2a-9c1d-2e3f4a5b6c7d',
  sellerId: 'e9f0e6a4-1b3c-4f2a-9c1d-2e3f4a5b6c7d',
  amountMinorUnits: 150_000,
  currency: 'RUB',
  purchasedAt: PURCHASED_AT.toISOString(),
};

describe('purchase view', () => {
  it('projects a purchase into the canonical shape', () => {
    const purchase = Purchase.restore({
      id: 'purchase-1',
      productId: 'product-1',
      buyerId: 'buyer-1',
      sellerId: 'seller-1',
      amount: Money.of(150_000, 'RUB'),
      purchasedAt: PURCHASED_AT,
    });

    expect(toPurchaseView(purchase)).toEqual({
      id: 'purchase-1',
      productId: 'product-1',
      buyerId: 'buyer-1',
      sellerId: 'seller-1',
      amountMinorUnits: 150_000,
      currency: 'RUB',
      purchasedAt: PURCHASED_AT.toISOString(),
    });
  });

  it('round-trips through the stored JSON representation without losing anything', () => {
    expect(parsePurchaseView(purchaseViewToJson(parsePurchaseView(VALID_VIEW)))).toEqual(
      VALID_VIEW,
    );
  });

  it('rejects a stored result with a missing field', () => {
    const { currency: _omitted, ...withoutCurrency } = VALID_VIEW;

    expect(() => parsePurchaseView(withoutCurrency)).toThrow(CorruptedIdempotentResultError);
  });

  it('rejects a stored result whose amount is not an integer', () => {
    expect(() => parsePurchaseView({ ...VALID_VIEW, amountMinorUnits: 1.5 })).toThrow(
      /amountMinorUnits/,
    );
  });

  it('rejects a stored result whose amount is negative', () => {
    expect(() => parsePurchaseView({ ...VALID_VIEW, amountMinorUnits: -1 })).toThrow(
      /amountMinorUnits/,
    );
  });

  it('rejects a stored result whose identifier is blank', () => {
    expect(() => parsePurchaseView({ ...VALID_VIEW, id: '   ' })).toThrow(/"id"/);
  });

  it('rejects a stored result whose field has the wrong type', () => {
    expect(() => parsePurchaseView({ ...VALID_VIEW, purchasedAt: 1_755_500_000 })).toThrow(
      /purchasedAt/,
    );
  });
});
