import { type Account, LedgerEntry, type Product, Purchase } from '../entities';
import { ProductAlreadySoldError, UnsupportedCurrencyError } from '../errors';

export interface SettlePurchaseParams {
  readonly purchaseId: string;
  readonly debitEntryId: string;
  readonly creditEntryId: string;
  readonly product: Product;
  readonly buyerAccount: Account;
  readonly sellerAccount: Account;
  readonly occurredAt: Date;
}

export interface PurchaseSettlement {
  readonly purchase: Purchase;
  readonly ledgerEntries: readonly LedgerEntry[];
}

/**
 * Pure domain service holding the complete purchase rule set.
 *
 * It has no knowledge of NestJS, HTTP or persistence, which makes every business rule and every
 * failure mode unit-testable without infrastructure.
 */
export class PurchaseSettlementService {
  public settle(params: SettlePurchaseParams): PurchaseSettlement {
    const { product, buyerAccount, sellerAccount, occurredAt } = params;

    if (!product.isAvailable()) {
      throw new ProductAlreadySoldError(product.id);
    }

    this.assertCurrencyMatches(product, buyerAccount);
    this.assertCurrencyMatches(product, sellerAccount);

    // Rejects a seller buying their own product before any money is moved.
    const purchase = Purchase.create({
      id: params.purchaseId,
      product,
      buyerId: buyerAccount.userId,
      purchasedAt: occurredAt,
    });

    buyerAccount.withdraw(product.price);
    sellerAccount.deposit(product.price);
    product.markAsSold(occurredAt);

    return {
      purchase,
      ledgerEntries: [
        LedgerEntry.debit({
          id: params.debitEntryId,
          purchaseId: purchase.id,
          accountId: buyerAccount.id,
          amount: product.price,
          createdAt: occurredAt,
        }),
        LedgerEntry.credit({
          id: params.creditEntryId,
          purchaseId: purchase.id,
          accountId: sellerAccount.id,
          amount: product.price,
          createdAt: occurredAt,
        }),
      ],
    };
  }

  private assertCurrencyMatches(product: Product, account: Account): void {
    if (account.currency !== product.price.currency) {
      throw new UnsupportedCurrencyError(product.price.currency, account.currency);
    }
  }
}
