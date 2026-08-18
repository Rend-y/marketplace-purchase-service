import { Inject, Injectable, Logger } from '@nestjs/common';

import type {
  ClockPort,
  TransactionManagerPort,
  UuidGeneratorPort,
} from '../../../../shared/application/ports';
import { INJECTION_TOKEN } from '../../../../shared/constants';
import { DomainError } from '../../../../shared/domain/errors';
import {
  AccountNotFoundError,
  Account,
  PURCHASE_AGGREGATE_TYPE,
  Product,
  ProductNotFoundError,
  PurchaseCompletedEvent,
  PurchaseSettlementService,
  type AccountRepositoryPort,
  type LedgerRepositoryPort,
  type ProductRepositoryPort,
  type PurchaseRepositoryPort,
} from '../../domain';
import type { OutboxRepositoryPort } from '../../../../shared/application/ports';
import type { CreatePurchaseCommand } from '../commands';
import { IdempotentRequestInProgressError } from '../errors';
import type { IdempotencyRepositoryPort, PurchaseMetricsPort } from '../ports';
import {
  parsePurchaseView,
  purchaseViewToJson,
  toPurchaseView,
  type CreatePurchaseResult,
} from '../results';

/**
 * Single transactional use case behind `POST /purchases`.
 *
 * Everything below runs inside one `READ COMMITTED` transaction:
 *   1. claim the idempotency key (unique index serializes duplicate requests)
 *   2. lock the product row (`FOR UPDATE`) - the point where concurrent buyers queue up
 *   3. lock both accounts in a deterministic order (deadlock-free)
 *   4. apply the domain rules and persist product, balances, purchase and ledger entries
 *   5. store the idempotent result and append the integration event to the outbox
 *
 * Either all of it commits, or nothing does; the event is published from the outbox after the
 * commit, so a crash can never leave money moved without an event, or vice versa.
 */
@Injectable()
export class CreatePurchaseUseCase {
  private readonly logger = new Logger(CreatePurchaseUseCase.name);

  constructor(
    @Inject(INJECTION_TOKEN.TRANSACTION_MANAGER)
    private readonly transactionManager: TransactionManagerPort,
    @Inject(INJECTION_TOKEN.PRODUCT_REPOSITORY)
    private readonly products: ProductRepositoryPort,
    @Inject(INJECTION_TOKEN.ACCOUNT_REPOSITORY)
    private readonly accounts: AccountRepositoryPort,
    @Inject(INJECTION_TOKEN.PURCHASE_REPOSITORY)
    private readonly purchases: PurchaseRepositoryPort,
    @Inject(INJECTION_TOKEN.LEDGER_REPOSITORY)
    private readonly ledger: LedgerRepositoryPort,
    @Inject(INJECTION_TOKEN.IDEMPOTENCY_REPOSITORY)
    private readonly idempotency: IdempotencyRepositoryPort,
    @Inject(INJECTION_TOKEN.OUTBOX_REPOSITORY)
    private readonly outbox: OutboxRepositoryPort,
    @Inject(INJECTION_TOKEN.CLOCK) private readonly clock: ClockPort,
    @Inject(INJECTION_TOKEN.UUID_GENERATOR) private readonly uuid: UuidGeneratorPort,
    @Inject(INJECTION_TOKEN.PURCHASE_METRICS) private readonly metrics: PurchaseMetricsPort,
    private readonly settlement: PurchaseSettlementService,
  ) {}

  public async execute(command: CreatePurchaseCommand): Promise<CreatePurchaseResult> {
    try {
      return await this.transactionManager.runInTransaction(() => this.process(command));
    } catch (error: unknown) {
      if (error instanceof DomainError) {
        this.metrics.recordRejected(error.code);
      }

      throw error;
    }
  }

  private async process(command: CreatePurchaseCommand): Promise<CreatePurchaseResult> {
    const claimId = this.uuid.generate();
    const claimed = await this.idempotency.claim({
      id: claimId,
      userId: command.buyerId,
      idempotencyKey: command.idempotencyKey,
      createdAt: this.clock.now(),
    });

    if (!claimed) {
      return this.replay(command);
    }

    const product = await this.products.findByIdForUpdate(command.productId);

    if (product === null) {
      throw new ProductNotFoundError(command.productId);
    }

    const { buyerAccount, sellerAccount } = await this.lockAccounts(command.buyerId, product);
    const occurredAt = this.clock.now();

    const settlement = this.settlement.settle({
      purchaseId: this.uuid.generate(),
      debitEntryId: this.uuid.generate(),
      creditEntryId: this.uuid.generate(),
      product,
      buyerAccount,
      sellerAccount,
      occurredAt,
    });

    await this.products.save(product);
    await this.accounts.saveMany([buyerAccount, sellerAccount]);
    await this.purchases.save(settlement.purchase);
    await this.ledger.saveEntries(settlement.ledgerEntries);

    const view = toPurchaseView(settlement.purchase);
    await this.idempotency.complete(claimId, settlement.purchase.id, purchaseViewToJson(view));

    const event = PurchaseCompletedEvent.from({
      eventId: this.uuid.generate(),
      purchase: settlement.purchase,
      occurredAt,
    });

    await this.outbox.enqueue({
      id: event.eventId,
      aggregateType: PURCHASE_AGGREGATE_TYPE,
      aggregateId: event.aggregateId,
      eventType: event.eventType,
      payload: event.toPayload(),
      occurredAt: event.occurredAt,
    });

    this.metrics.recordCreated();
    this.logger.log({
      message: 'Purchase completed',
      purchaseId: settlement.purchase.id,
      productId: settlement.purchase.productId,
      buyerId: settlement.purchase.buyerId,
      sellerId: settlement.purchase.sellerId,
      amountMinorUnits: settlement.purchase.amount.minorUnits,
      currency: settlement.purchase.amount.currency,
    });

    return { purchase: view, replayed: false };
  }

  private async lockAccounts(
    buyerId: string,
    product: Product,
  ): Promise<{ buyerAccount: Account; sellerAccount: Account }> {
    const currency = product.price.currency;
    const locked = await this.accounts.lockByUserIds([buyerId, product.sellerId], currency);

    const buyerAccount = locked.find((account) => account.userId === buyerId);

    if (buyerAccount === undefined) {
      throw new AccountNotFoundError(buyerId, currency);
    }

    // A self-purchase resolves to the same account; the domain rejects it before any mutation.
    const sellerAccount = locked.find((account) => account.userId === product.sellerId);

    if (sellerAccount === undefined) {
      throw new AccountNotFoundError(product.sellerId, currency);
    }

    return { buyerAccount, sellerAccount };
  }

  private async replay(command: CreatePurchaseCommand): Promise<CreatePurchaseResult> {
    const record = await this.idempotency.findByUserAndKey(command.buyerId, command.idempotencyKey);

    const storedResult = record === null ? null : record.result;

    if (storedResult === null) {
      throw new IdempotentRequestInProgressError(command.idempotencyKey);
    }

    this.metrics.recordReplayed();

    return { purchase: parsePurchaseView(storedResult), replayed: true };
  }
}
