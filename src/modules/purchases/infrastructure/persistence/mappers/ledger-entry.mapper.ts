import type { LedgerEntry } from '../../../domain';
import type { LedgerEntryOrmEntity } from '../entities';

export const LedgerEntryMapper = {
  toPersistence(entry: LedgerEntry): LedgerEntryOrmEntity {
    return {
      id: entry.id,
      purchaseId: entry.purchaseId,
      accountId: entry.accountId,
      direction: entry.direction,
      amountMinor: entry.amount.minorUnits,
      currency: entry.amount.currency,
      createdAt: entry.createdAt,
    };
  },
} as const;
