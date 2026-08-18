import type { Purchase } from '../entities';

export interface PurchaseRepositoryPort {
  /**
   * Inserts the purchase.
   *
   * A unique constraint on `product_id` is the final guarantee that a product is sold once;
   * a violation is translated into a `ProductAlreadySoldError`.
   */
  save(purchase: Purchase): Promise<void>;
}
