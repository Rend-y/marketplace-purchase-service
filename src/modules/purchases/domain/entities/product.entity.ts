import type { Money } from '../../../../shared/domain/value-objects';
import { PRODUCT_STATUS, type ProductStatus } from '../enums';
import { ProductAlreadySoldError } from '../errors';

export interface ProductSnapshot {
  readonly id: string;
  readonly sellerId: string;
  readonly title: string;
  readonly price: Money;
  readonly status: ProductStatus;
  readonly soldAt: Date | null;
}

export class Product {
  private constructor(
    public readonly id: string,
    public readonly sellerId: string,
    public readonly title: string,
    public readonly price: Money,
    private currentStatus: ProductStatus,
    private soldAtValue: Date | null,
  ) {}

  public static restore(snapshot: ProductSnapshot): Product {
    return new Product(
      snapshot.id,
      snapshot.sellerId,
      snapshot.title,
      snapshot.price,
      snapshot.status,
      snapshot.soldAt,
    );
  }

  public get status(): ProductStatus {
    return this.currentStatus;
  }

  public get soldAt(): Date | null {
    return this.soldAtValue;
  }

  public isAvailable(): boolean {
    return this.currentStatus === PRODUCT_STATUS.AVAILABLE;
  }

  public isSoldBy(userId: string): boolean {
    return this.sellerId === userId;
  }

  /**
   * The transition is guarded here as well as by the row lock and the unique constraint on
   * `purchases.product_id`; the domain must not depend on infrastructure for its own invariant.
   */
  public markAsSold(soldAt: Date): void {
    if (!this.isAvailable()) {
      throw new ProductAlreadySoldError(this.id);
    }

    this.currentStatus = PRODUCT_STATUS.SOLD;
    this.soldAtValue = soldAt;
  }
}
