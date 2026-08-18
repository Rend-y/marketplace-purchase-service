import { beforeEach, describe, expect, it } from 'vitest';

import { Money } from '../../../../shared/domain/value-objects';
import { Account, Product } from '../entities';
import { LEDGER_DIRECTION, PRODUCT_STATUS } from '../enums';
import {
  InsufficientFundsError,
  ProductAlreadySoldError,
  SelfPurchaseForbiddenError,
  UnsupportedCurrencyError,
} from '../errors';
import { PurchaseSettlementService } from './purchase-settlement.service';

const RUB = 'RUB';
const PRICE_MINOR = 150_000;

const BUYER_ID = 'buyer-1';
const SELLER_ID = 'seller-1';
const PRODUCT_ID = 'product-1';
const OCCURRED_AT = new Date('2026-08-18T10:00:00.000Z');

const buildProduct = (
  overrides: { status?: 'AVAILABLE' | 'SOLD'; currency?: string } = {},
): Product =>
  Product.restore({
    id: PRODUCT_ID,
    sellerId: SELLER_ID,
    title: 'Mechanical keyboard',
    price: Money.of(PRICE_MINOR, overrides.currency ?? RUB),
    status: overrides.status ?? PRODUCT_STATUS.AVAILABLE,
    soldAt: overrides.status === PRODUCT_STATUS.SOLD ? OCCURRED_AT : null,
  });

const buildAccount = (id: string, userId: string, balanceMinor: number, currency = RUB): Account =>
  Account.restore({ id, userId, balance: Money.of(balanceMinor, currency) });

const settleParams = (product: Product, buyerAccount: Account, sellerAccount: Account) => ({
  purchaseId: 'purchase-1',
  debitEntryId: 'entry-debit',
  creditEntryId: 'entry-credit',
  product,
  buyerAccount,
  sellerAccount,
  occurredAt: OCCURRED_AT,
});

describe('PurchaseSettlementService', () => {
  let service: PurchaseSettlementService;

  beforeEach(() => {
    service = new PurchaseSettlementService();
  });

  it('moves the price from the buyer to the seller and marks the product as sold', () => {
    const product = buildProduct();
    const buyer = buildAccount('account-buyer', BUYER_ID, 500_000);
    const seller = buildAccount('account-seller', SELLER_ID, 0);

    const { purchase } = service.settle(settleParams(product, buyer, seller));

    expect(buyer.balance.minorUnits).toBe(350_000);
    expect(seller.balance.minorUnits).toBe(PRICE_MINOR);
    expect(product.status).toBe(PRODUCT_STATUS.SOLD);
    expect(product.soldAt).toEqual(OCCURRED_AT);

    expect(purchase.buyerId).toBe(BUYER_ID);
    expect(purchase.sellerId).toBe(SELLER_ID);
    expect(purchase.amount.minorUnits).toBe(PRICE_MINOR);
    expect(purchase.purchasedAt).toEqual(OCCURRED_AT);
  });

  it('records a balanced double entry for every purchase', () => {
    const product = buildProduct();
    const buyer = buildAccount('account-buyer', BUYER_ID, 500_000);
    const seller = buildAccount('account-seller', SELLER_ID, 0);

    const { ledgerEntries } = service.settle(settleParams(product, buyer, seller));

    expect(ledgerEntries).toHaveLength(2);

    const debit = ledgerEntries.find((entry) => entry.direction === LEDGER_DIRECTION.DEBIT);
    const credit = ledgerEntries.find((entry) => entry.direction === LEDGER_DIRECTION.CREDIT);

    expect(debit?.accountId).toBe('account-buyer');
    expect(credit?.accountId).toBe('account-seller');
    expect(debit?.amount.minorUnits).toBe(credit?.amount.minorUnits);
  });

  it('rejects a product that is already sold', () => {
    const product = buildProduct({ status: PRODUCT_STATUS.SOLD });
    const buyer = buildAccount('account-buyer', BUYER_ID, 500_000);
    const seller = buildAccount('account-seller', SELLER_ID, 0);

    expect(() => service.settle(settleParams(product, buyer, seller))).toThrow(
      ProductAlreadySoldError,
    );
    expect(buyer.balance.minorUnits).toBe(500_000);
  });

  it('rejects a seller buying their own product without touching the balance', () => {
    const product = buildProduct();
    const sellerAccount = buildAccount('account-seller', SELLER_ID, 500_000);

    expect(() => service.settle(settleParams(product, sellerAccount, sellerAccount))).toThrow(
      SelfPurchaseForbiddenError,
    );
    expect(sellerAccount.balance.minorUnits).toBe(500_000);
    expect(product.status).toBe(PRODUCT_STATUS.AVAILABLE);
  });

  it('rejects a purchase the buyer cannot afford and leaves the product available', () => {
    const product = buildProduct();
    const buyer = buildAccount('account-buyer', BUYER_ID, PRICE_MINOR - 1);
    const seller = buildAccount('account-seller', SELLER_ID, 0);

    expect(() => service.settle(settleParams(product, buyer, seller))).toThrow(
      InsufficientFundsError,
    );
    expect(product.status).toBe(PRODUCT_STATUS.AVAILABLE);
    expect(seller.balance.minorUnits).toBe(0);
  });

  it('allows a purchase that spends the balance down to exactly zero', () => {
    const product = buildProduct();
    const buyer = buildAccount('account-buyer', BUYER_ID, PRICE_MINOR);
    const seller = buildAccount('account-seller', SELLER_ID, 0);

    service.settle(settleParams(product, buyer, seller));

    expect(buyer.balance.minorUnits).toBe(0);
  });

  it('rejects an account whose currency differs from the product currency', () => {
    const product = buildProduct({ currency: 'USD' });
    const buyer = buildAccount('account-buyer', BUYER_ID, 500_000, RUB);
    const seller = buildAccount('account-seller', SELLER_ID, 0, RUB);

    expect(() => service.settle(settleParams(product, buyer, seller))).toThrow(
      UnsupportedCurrencyError,
    );
  });
});
