import type { Product } from '../entities';

export interface ProductRepositoryPort {
  /**
   * Reads the product with `SELECT ... FOR UPDATE`.
   *
   * This is the serialization point of the whole flow: concurrent buyers of the same product
   * queue on this row lock, so only one of them can observe it as available.
   */
  findByIdForUpdate(productId: string): Promise<Product | null>;

  /** Persists the mutated aggregate; the caller must already hold the row lock. */
  save(product: Product): Promise<void>;
}
