import type { PurchaseView } from '../../application';
import type { PurchaseResponseDto } from '../dto';

export const PurchaseResponseMapper = {
  toDto(view: PurchaseView): PurchaseResponseDto {
    return {
      id: view.id,
      productId: view.productId,
      buyerId: view.buyerId,
      sellerId: view.sellerId,
      amountMinorUnits: view.amountMinorUnits,
      currency: view.currency,
      purchasedAt: view.purchasedAt,
    };
  },
} as const;
