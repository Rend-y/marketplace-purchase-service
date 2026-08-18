import 'dotenv/config';

import { v4 as uuidv4 } from 'uuid';

import {
  AccountOrmEntity,
  ProductOrmEntity,
  UserOrmEntity,
} from '../modules/purchases/infrastructure/persistence/entities';
import { createDataSource } from './data-source';

const CURRENCY = 'RUB';
const BUYER_BALANCE_MINOR = 500_000;
const PRODUCT_PRICE_MINOR = 150_000;

/** Convenience fixture for manual checks of the API; not used by the automated tests. */
const seed = async (): Promise<void> => {
  const dataSource = createDataSource();
  await dataSource.initialize();

  try {
    await dataSource.transaction(async (manager) => {
      const now = new Date();
      const buyerId = uuidv4();
      const sellerId = uuidv4();
      const productId = uuidv4();

      await manager.getRepository(UserOrmEntity).insert([
        { id: buyerId, email: `buyer-${buyerId}@example.com`, createdAt: now },
        { id: sellerId, email: `seller-${sellerId}@example.com`, createdAt: now },
      ]);

      await manager.getRepository(AccountOrmEntity).insert([
        {
          id: uuidv4(),
          userId: buyerId,
          currency: CURRENCY,
          balanceMinor: BUYER_BALANCE_MINOR,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: uuidv4(),
          userId: sellerId,
          currency: CURRENCY,
          balanceMinor: 0,
          createdAt: now,
          updatedAt: now,
        },
      ]);

      await manager.getRepository(ProductOrmEntity).insert({
        id: productId,
        sellerId,
        title: 'Mechanical keyboard',
        priceMinor: PRODUCT_PRICE_MINOR,
        currency: CURRENCY,
        status: 'AVAILABLE',
        soldAt: null,
        createdAt: now,
        updatedAt: now,
      });

      process.stdout.write(
        [
          'seeded:',
          `  buyerId:   ${buyerId}`,
          `  sellerId:  ${sellerId}`,
          `  productId: ${productId}`,
          '',
          'try it:',
          `  curl -X POST http://localhost:3000/purchases -H "content-type: application/json" -H "idempotency-key: ${uuidv4()}" -d '{"productId":"${productId}","buyerId":"${buyerId}"}'`,
          '',
        ].join('\n'),
      );
    });
  } finally {
    await dataSource.destroy();
  }
};

seed().catch((error: unknown) => {
  console.error('seed failed', error);
  process.exitCode = 1;
});
