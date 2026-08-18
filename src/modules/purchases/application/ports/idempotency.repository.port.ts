import type { JsonObject } from '../../../../shared/types';

export interface IdempotencyClaimParams {
  readonly id: string;
  readonly userId: string;
  readonly idempotencyKey: string;
  readonly createdAt: Date;
}

export interface IdempotencyRecord {
  readonly id: string;
  readonly resourceId: string | null;
  readonly result: JsonObject | null;
}

export interface IdempotencyRepositoryPort {
  /**
   * Attempts to reserve the key with `INSERT ... ON CONFLICT DO NOTHING`.
   *
   * Returns `false` when the key is already taken. Two concurrent requests carrying the same key
   * serialize on the unique index: the second one blocks until the first commits or rolls back,
   * which is exactly the desired behaviour - it either replays the stored result or proceeds.
   */
  claim(params: IdempotencyClaimParams): Promise<boolean>;

  findByUserAndKey(userId: string, idempotencyKey: string): Promise<IdempotencyRecord | null>;

  /** Stores the canonical result of the operation inside the same transaction as the claim. */
  complete(claimId: string, resourceId: string, result: JsonObject): Promise<void>;
}
