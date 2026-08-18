import type { Money } from '../../../../shared/domain/value-objects';
import { SelfPurchaseForbiddenError } from '../errors';
import type { Product } from './product.entity';

export interface PurchaseSnapshot {
  readonly id: string;
  readonly productId: string;
  readonly buyerId: string;
  readonly sellerId: string;
  readonly amount: Money;
  readonly purchasedAt: Date;
}

export interface CreatePurchaseParams {
  readonly id: string;
  readonly product: Product;
  readonly buyerId: string;
  readonly purchasedAt: Date;
}

export class Purchase {
  private constructor(
    public readonly id: string,
    public readonly productId: string,
    public readonly buyerId: string,
    public readonly sellerId: string,
    public readonly amount: Money,
    public readonly purchasedAt: Date,
  ) {}

  public static create(params: CreatePurchaseParams): Purchase {
    const { id, product, buyerId, purchasedAt } = params;

    if (product.isSoldBy(buyerId)) {
      throw new SelfPurchaseForbiddenError(buyerId, product.id);
    }

    return new Purchase(id, product.id, buyerId, product.sellerId, product.price, purchasedAt);
  }

  public static restore(snapshot: PurchaseSnapshot): Purchase {
    return new Purchase(
      snapshot.id,
      snapshot.productId,
      snapshot.buyerId,
      snapshot.sellerId,
      snapshot.amount,
      snapshot.purchasedAt,
    );
  }
}
