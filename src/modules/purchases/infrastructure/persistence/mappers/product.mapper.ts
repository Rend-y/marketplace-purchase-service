import { Money } from '../../../../../shared/domain/value-objects';
import { Product } from '../../../domain';
import type { ProductOrmEntity } from '../entities';

export const ProductMapper = {
  toDomain(row: ProductOrmEntity): Product {
    return Product.restore({
      id: row.id,
      sellerId: row.sellerId,
      title: row.title,
      price: Money.of(row.priceMinor, row.currency),
      status: row.status,
      soldAt: row.soldAt,
    });
  },
} as const;
