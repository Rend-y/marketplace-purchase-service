import type { Money } from '../../../../shared/domain/value-objects';
import { LEDGER_DIRECTION, type LedgerDirection } from '../enums';

export interface LedgerEntrySnapshot {
  readonly id: string;
  readonly purchaseId: string;
  readonly accountId: string;
  readonly direction: LedgerDirection;
  readonly amount: Money;
  readonly createdAt: Date;
}

/**
 * Immutable double-entry record. Every purchase produces exactly one DEBIT and one CREDIT of
 * the same amount, so balances remain auditable and reconcilable.
 */
export class LedgerEntry {
  private constructor(
    public readonly id: string,
    public readonly purchaseId: string,
    public readonly accountId: string,
    public readonly direction: LedgerDirection,
    public readonly amount: Money,
    public readonly createdAt: Date,
  ) {}

  public static debit(snapshot: Omit<LedgerEntrySnapshot, 'direction'>): LedgerEntry {
    return new LedgerEntry(
      snapshot.id,
      snapshot.purchaseId,
      snapshot.accountId,
      LEDGER_DIRECTION.DEBIT,
      snapshot.amount,
      snapshot.createdAt,
    );
  }

  public static credit(snapshot: Omit<LedgerEntrySnapshot, 'direction'>): LedgerEntry {
    return new LedgerEntry(
      snapshot.id,
      snapshot.purchaseId,
      snapshot.accountId,
      LEDGER_DIRECTION.CREDIT,
      snapshot.amount,
      snapshot.createdAt,
    );
  }

  public static restore(snapshot: LedgerEntrySnapshot): LedgerEntry {
    return new LedgerEntry(
      snapshot.id,
      snapshot.purchaseId,
      snapshot.accountId,
      snapshot.direction,
      snapshot.amount,
      snapshot.createdAt,
    );
  }
}
