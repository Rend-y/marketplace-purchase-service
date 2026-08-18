import type { Account } from '../entities';

export interface AccountRepositoryPort {
  /**
   * Locks the accounts of the given users in a deterministic order (by account id) to make
   * deadlocks between mutually purchasing users impossible.
   */
  lockByUserIds(userIds: readonly string[], currency: string): Promise<Account[]>;

  saveMany(accounts: readonly Account[]): Promise<void>;
}
