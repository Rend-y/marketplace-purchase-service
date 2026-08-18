import { Money } from '../../../../../shared/domain/value-objects';
import { Purchase } from '../../../domain';
import type { PurchaseOrmEntity } from '../entities';

export const PurchaseMapper = {
  toDomain(row: PurchaseOrmEntity): Purchase {
    return Purchase.restore({
      id: row.id,
      productId: row.productId,
      buyerId: row.buyerId,
      sellerId: row.sellerId,
      amount: Money.of(row.amountMinor, row.currency),
      purchasedAt: row.purchasedAt,
    });
  },

  toPersistence(purchase: Purchase): PurchaseOrmEntity {
    return {
      id: purchase.id,
      productId: purchase.productId,
      buyerId: purchase.buyerId,
      sellerId: purchase.sellerId,
      amountMinor: purchase.amount.minorUnits,
      currency: purchase.amount.currency,
      purchasedAt: purchase.purchasedAt,
    };
  },
} as const;
