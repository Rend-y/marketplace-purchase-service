import type { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import {
  AccountOrmEntity,
  ProductOrmEntity,
  UserOrmEntity,
} from '../../../src/modules/purchases/infrastructure/persistence/entities';

export const DEFAULT_CURRENCY = 'RUB';
export const DEFAULT_PRICE_MINOR = 150_000;
export const DEFAULT_BALANCE_MINOR = 500_000;

export interface SeededUser {
  readonly userId: string;
  readonly accountId: string;
}

export interface SeededProduct {
  readonly productId: string;
  readonly sellerId: string;
  readonly priceMinor: number;
  readonly currency: string;
}

export interface CreateUserOptions {
  readonly balanceMinor?: number;
  readonly currency?: string;
}

export const createUser = async (
  dataSource: DataSource,
  options: CreateUserOptions = {},
): Promise<SeededUser> => {
  const userId = uuidv4();
  const accountId = uuidv4();
  const now = new Date();

  await dataSource
    .getRepository(UserOrmEntity)
    .insert({ id: userId, email: `user-${userId}@example.com`, createdAt: now });

  await dataSource.getRepository(AccountOrmEntity).insert({
    id: accountId,
    userId,
    currency: options.currency ?? DEFAULT_CURRENCY,
    balanceMinor: options.balanceMinor ?? DEFAULT_BALANCE_MINOR,
    createdAt: now,
    updatedAt: now,
  });

  return { userId, accountId };
};

export interface CreateProductOptions {
  readonly priceMinor?: number;
  readonly currency?: string;
  readonly title?: string;
}

export const createProduct = async (
  dataSource: DataSource,
  sellerId: string,
  options: CreateProductOptions = {},
): Promise<SeededProduct> => {
  const productId = uuidv4();
  const now = new Date();
  const priceMinor = options.priceMinor ?? DEFAULT_PRICE_MINOR;
  const currency = options.currency ?? DEFAULT_CURRENCY;

  await dataSource.getRepository(ProductOrmEntity).insert({
    id: productId,
    sellerId,
    title: options.title ?? 'Mechanical keyboard',
    priceMinor,
    currency,
    status: 'AVAILABLE',
    soldAt: null,
    createdAt: now,
    updatedAt: now,
  });

  return { productId, sellerId, priceMinor, currency };
};

export interface Marketplace {
  readonly buyer: SeededUser;
  readonly seller: SeededUser;
  readonly product: SeededProduct;
}

/** The default arrangement used by most scenarios: one buyer, one seller, one available product. */
export const createMarketplace = async (
  dataSource: DataSource,
  options: { readonly buyerBalanceMinor?: number; readonly priceMinor?: number } = {},
): Promise<Marketplace> => {
  const buyer = await createUser(dataSource, { balanceMinor: options.buyerBalanceMinor });
  const seller = await createUser(dataSource, { balanceMinor: 0 });
  const product = await createProduct(dataSource, seller.userId, {
    priceMinor: options.priceMinor,
  });

  return { buyer, seller, product };
};

export const readAccountBalance = async (
  dataSource: DataSource,
  accountId: string,
): Promise<number> => {
  const account = await dataSource
    .getRepository(AccountOrmEntity)
    .findOneOrFail({ where: { id: accountId } });

  return account.balanceMinor;
};

export const readProduct = async (
  dataSource: DataSource,
  productId: string,
): Promise<ProductOrmEntity> =>
  dataSource.getRepository(ProductOrmEntity).findOneOrFail({ where: { id: productId } });
