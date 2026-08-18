import type { LedgerEntry } from '../entities';

export interface LedgerRepositoryPort {
  saveEntries(entries: readonly LedgerEntry[]): Promise<void>;
}
