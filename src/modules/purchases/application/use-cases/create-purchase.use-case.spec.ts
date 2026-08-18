import { beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  ClockPort,
  OutboxMessageToEnqueue,
  OutboxRepositoryPort,
  TransactionManagerPort,
  UuidGeneratorPort,
} from '../../../../shared/application/ports';
import { Money } from '../../../../shared/domain/value-objects';
import type { JsonObject } from '../../../../shared/types';
import {
  Account,
  AccountNotFoundError,
  InsufficientFundsError,
  PRODUCT_STATUS,
  Product,
  ProductNotFoundError,
  PurchaseSettlementService,
  SelfPurchaseForbiddenError,
  type AccountRepositoryPort,
  type LedgerEntry,
  type LedgerRepositoryPort,
  type ProductRepositoryPort,
  type Purchase,
  type PurchaseRepositoryPort,
} from '../../domain';
import { IdempotentRequestInProgressError } from '../errors';
import type {
  IdempotencyClaimParams,
  IdempotencyRecord,
  IdempotencyRepositoryPort,
  PurchaseMetricsPort,
} from '../ports';
import { CreatePurchaseUseCase } from './create-purchase.use-case';

const RUB = 'RUB';
const PRICE_MINOR = 150_000;
const BUYER_ID = 'buyer-1';
const SELLER_ID = 'seller-1';
const PRODUCT_ID = 'product-1';
const IDEMPOTENCY_KEY = 'idempotency-key-1';
const NOW = new Date('2026-08-18T10:00:00.000Z');

class FakeTransactionManager implements TransactionManagerPort {
  public calls = 0;

  public runInTransaction<TResult>(work: () => Promise<TResult>): Promise<TResult> {
    this.calls += 1;
    return work();
  }
}

class FakeProductRepository implements ProductRepositoryPort {
  public saved: Product[] = [];

  constructor(private readonly product: Product | null) {}

  public findByIdForUpdate(): Promise<Product | null> {
    return Promise.resolve(this.product);
  }

  public save(product: Product): Promise<void> {
    this.saved.push(product);
    return Promise.resolve();
  }
}

class FakeAccountRepository implements AccountRepositoryPort {
  public saved: readonly Account[] = [];

  constructor(private readonly accounts: Account[]) {}

  public lockByUserIds(userIds: readonly string[]): Promise<Account[]> {
    return Promise.resolve(this.accounts.filter((account) => userIds.includes(account.userId)));
  }

  public saveMany(accounts: readonly Account[]): Promise<void> {
    this.saved = accounts;
    return Promise.resolve();
  }
}

class FakePurchaseRepository implements PurchaseRepositoryPort {
  public saved: Purchase[] = [];

  public save(purchase: Purchase): Promise<void> {
    this.saved.push(purchase);
    return Promise.resolve();
  }
}

class FakeLedgerRepository implements LedgerRepositoryPort {
  public saved: readonly LedgerEntry[] = [];

  public saveEntries(entries: readonly LedgerEntry[]): Promise<void> {
    this.saved = entries;
    return Promise.resolve();
  }
}

interface CompletedClaim {
  readonly claimId: string;
  readonly resourceId: string;
  readonly result: JsonObject;
}

class FakeIdempotencyRepository implements IdempotencyRepositoryPort {
  public claims: IdempotencyClaimParams[] = [];
  public completed: CompletedClaim[] = [];

  constructor(
    private readonly claimable: boolean,
    private readonly existing: IdempotencyRecord | null = null,
  ) {}

  public claim(params: IdempotencyClaimParams): Promise<boolean> {
    this.claims.push(params);
    return Promise.resolve(this.claimable);
  }

  public findByUserAndKey(): Promise<IdempotencyRecord | null> {
    return Promise.resolve(this.existing);
  }

  public complete(claimId: string, resourceId: string, result: JsonObject): Promise<void> {
    this.completed.push({ claimId, resourceId, result });
    return Promise.resolve();
  }
}

class FakeOutboxRepository implements OutboxRepositoryPort {
  public enqueued: OutboxMessageToEnqueue[] = [];

  public enqueue(message: OutboxMessageToEnqueue): Promise<void> {
    this.enqueued.push(message);
    return Promise.resolve();
  }

  public lockBatchForPublishing(): Promise<[]> {
    return Promise.resolve([]);
  }

  public markPublished(): Promise<void> {
    return Promise.resolve();
  }

  public markFailed(): Promise<void> {
    return Promise.resolve();
  }

  public countPending(): Promise<number> {
    return Promise.resolve(0);
  }
}

class FixedClock implements ClockPort {
  public now(): Date {
    return NOW;
  }
}

class SequentialUuidGenerator implements UuidGeneratorPort {
  private counter = 0;

  public generate(): string {
    this.counter += 1;
    return `uuid-${String(this.counter)}`;
  }
}

const buildMetrics = () => ({
  recordCreated: vi.fn(),
  recordReplayed: vi.fn(),
  recordRejected: vi.fn(),
});

const buildProduct = (): Product =>
  Product.restore({
    id: PRODUCT_ID,
    sellerId: SELLER_ID,
    title: 'Mechanical keyboard',
    price: Money.of(PRICE_MINOR, RUB),
    status: PRODUCT_STATUS.AVAILABLE,
    soldAt: null,
  });

const buildAccounts = (buyerBalanceMinor = 500_000): Account[] => [
  Account.restore({
    id: 'account-buyer',
    userId: BUYER_ID,
    balance: Money.of(buyerBalanceMinor, RUB),
  }),
  Account.restore({ id: 'account-seller', userId: SELLER_ID, balance: Money.of(0, RUB) }),
];

interface HarnessOverrides {
  readonly product?: Product | null;
  readonly accounts?: Account[];
  readonly claimable?: boolean;
  readonly existingRecord?: IdempotencyRecord | null;
}

const buildHarness = (overrides: HarnessOverrides = {}) => {
  const transactionManager = new FakeTransactionManager();
  const products = new FakeProductRepository(
    overrides.product === undefined ? buildProduct() : overrides.product,
  );
  const accounts = new FakeAccountRepository(overrides.accounts ?? buildAccounts());
  const purchases = new FakePurchaseRepository();
  const ledger = new FakeLedgerRepository();
  const idempotency = new FakeIdempotencyRepository(
    overrides.claimable ?? true,
    overrides.existingRecord ?? null,
  );
  const outbox = new FakeOutboxRepository();
  const metrics = buildMetrics();

  const useCase = new CreatePurchaseUseCase(
    transactionManager,
    products,
    accounts,
    purchases,
    ledger,
    idempotency,
    outbox,
    new FixedClock(),
    new SequentialUuidGenerator(),
    metrics satisfies PurchaseMetricsPort,
    new PurchaseSettlementService(),
  );

  return {
    useCase,
    transactionManager,
    products,
    accounts,
    purchases,
    ledger,
    idempotency,
    outbox,
    metrics,
  };
};

const command = {
  productId: PRODUCT_ID,
  buyerId: BUYER_ID,
  idempotencyKey: IDEMPOTENCY_KEY,
};

describe('CreatePurchaseUseCase', () => {
  let harness: ReturnType<typeof buildHarness>;

  beforeEach(() => {
    harness = buildHarness();
  });

  it('runs the whole purchase inside a single transaction', async () => {
    await harness.useCase.execute(command);

    expect(harness.transactionManager.calls).toBe(1);
  });

  it('completes a purchase and returns a non-replayed result', async () => {
    const result = await harness.useCase.execute(command);

    expect(result.replayed).toBe(false);
    expect(result.purchase.productId).toBe(PRODUCT_ID);
    expect(result.purchase.buyerId).toBe(BUYER_ID);
    expect(result.purchase.sellerId).toBe(SELLER_ID);
    expect(result.purchase.amountMinorUnits).toBe(PRICE_MINOR);
    expect(result.purchase.currency).toBe(RUB);
    expect(result.purchase.purchasedAt).toBe(NOW.toISOString());
  });

  it('persists the product, both balances, the purchase and the ledger entries', async () => {
    await harness.useCase.execute(command);

    expect(harness.products.saved).toHaveLength(1);
    expect(harness.products.saved[0]?.status).toBe(PRODUCT_STATUS.SOLD);
    expect(harness.accounts.saved).toHaveLength(2);
    expect(harness.purchases.saved).toHaveLength(1);
    expect(harness.ledger.saved).toHaveLength(2);
  });

  it('claims the idempotency key before doing anything else and stores the result', async () => {
    const result = await harness.useCase.execute(command);

    expect(harness.idempotency.claims).toHaveLength(1);
    expect(harness.idempotency.claims[0]).toMatchObject({
      userId: BUYER_ID,
      idempotencyKey: IDEMPOTENCY_KEY,
    });
    expect(harness.idempotency.completed).toHaveLength(1);
    expect(harness.idempotency.completed[0]?.resourceId).toBe(result.purchase.id);
  });

  it('appends the integration event to the outbox instead of publishing it directly', async () => {
    const result = await harness.useCase.execute(command);

    expect(harness.outbox.enqueued).toHaveLength(1);

    const [message] = harness.outbox.enqueued;

    expect(message.eventType).toBe('purchase.completed');
    expect(message.aggregateId).toBe(result.purchase.id);
    expect(message.payload).toMatchObject({
      eventType: 'purchase.completed',
      eventVersion: 1,
      data: {
        purchaseId: result.purchase.id,
        productId: PRODUCT_ID,
        buyerId: BUYER_ID,
        sellerId: SELLER_ID,
        amount: { minorUnits: PRICE_MINOR, currency: RUB },
      },
    });
  });

  it('counts a completed purchase in the business metrics', async () => {
    await harness.useCase.execute(command);

    expect(harness.metrics.recordCreated).toHaveBeenCalledTimes(1);
    expect(harness.metrics.recordReplayed).not.toHaveBeenCalled();
  });

  describe('when the idempotency key was already used', () => {
    const storedResult: JsonObject = {
      id: '2b0f9d7a-2f1e-4a3b-8c5d-6e7f8a9b0c1d',
      productId: '3c1f9d7a-2f1e-4a3b-8c5d-6e7f8a9b0c1d',
      buyerId: '4d2f9d7a-2f1e-4a3b-8c5d-6e7f8a9b0c1d',
      sellerId: '5e3f9d7a-2f1e-4a3b-8c5d-6e7f8a9b0c1d',
      amountMinorUnits: PRICE_MINOR,
      currency: RUB,
      purchasedAt: NOW.toISOString(),
    };

    it('replays the stored result without touching the product', async () => {
      const replayHarness = buildHarness({
        claimable: false,
        existingRecord: { id: 'claim-1', resourceId: 'purchase-1', result: storedResult },
      });

      const result = await replayHarness.useCase.execute(command);

      expect(result.replayed).toBe(true);
      expect(result.purchase).toEqual(storedResult);
      expect(replayHarness.products.saved).toHaveLength(0);
      expect(replayHarness.purchases.saved).toHaveLength(0);
      expect(replayHarness.outbox.enqueued).toHaveLength(0);
      expect(replayHarness.metrics.recordReplayed).toHaveBeenCalledTimes(1);
    });

    it('refuses to answer while the stored record has no result yet', async () => {
      const replayHarness = buildHarness({
        claimable: false,
        existingRecord: { id: 'claim-1', resourceId: null, result: null },
      });

      await expect(replayHarness.useCase.execute(command)).rejects.toBeInstanceOf(
        IdempotentRequestInProgressError,
      );
    });
  });

  describe('failure paths', () => {
    it('rejects an unknown product', async () => {
      const failing = buildHarness({ product: null });

      await expect(failing.useCase.execute(command)).rejects.toBeInstanceOf(ProductNotFoundError);
      expect(failing.metrics.recordRejected).toHaveBeenCalledWith('PRODUCT_NOT_FOUND');
    });

    it('rejects a buyer without an account in the product currency', async () => {
      const failing = buildHarness({ accounts: [] });

      await expect(failing.useCase.execute(command)).rejects.toBeInstanceOf(AccountNotFoundError);
    });

    it('rejects a buyer who cannot afford the product', async () => {
      const failing = buildHarness({ accounts: buildAccounts(PRICE_MINOR - 1) });

      await expect(failing.useCase.execute(command)).rejects.toBeInstanceOf(InsufficientFundsError);
      expect(failing.metrics.recordRejected).toHaveBeenCalledWith('INSUFFICIENT_FUNDS');
      expect(failing.purchases.saved).toHaveLength(0);
      expect(failing.outbox.enqueued).toHaveLength(0);
    });

    it('rejects a seller buying their own product', async () => {
      const failing = buildHarness({
        accounts: [
          Account.restore({
            id: 'account-seller',
            userId: SELLER_ID,
            balance: Money.of(500_000, RUB),
          }),
        ],
      });

      await expect(
        failing.useCase.execute({ ...command, buyerId: SELLER_ID }),
      ).rejects.toBeInstanceOf(SelfPurchaseForbiddenError);
    });
  });
});
