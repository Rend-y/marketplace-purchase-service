import { ConflictError, InvariantViolationError } from '../../../../shared/domain/errors';

export const IDEMPOTENCY_ERROR_CODE = {
  REQUEST_IN_PROGRESS: 'IDEMPOTENT_REQUEST_IN_PROGRESS',
  CORRUPTED_RESULT: 'CORRUPTED_IDEMPOTENT_RESULT',
} as const;

/**
 * Defensive guard for a committed-but-incomplete idempotency record. The normal flow makes this
 * unreachable (the claim and its result commit atomically), but a crashed manual intervention or
 * a future non-atomic writer would otherwise produce a silent wrong replay.
 */
export class IdempotentRequestInProgressError extends ConflictError {
  public readonly code = IDEMPOTENCY_ERROR_CODE.REQUEST_IN_PROGRESS;

  constructor(idempotencyKey: string) {
    super('A request with this idempotency key is still being processed', { idempotencyKey });
  }
}

/**
 * The stored result no longer matches the shape the service writes.
 *
 * Replaying a half-understood payload would be worse than failing, so this is treated as an
 * unreachable state and surfaces as a 500 rather than as a client error.
 */
export class CorruptedIdempotentResultError extends InvariantViolationError {
  public readonly code = IDEMPOTENCY_ERROR_CODE.CORRUPTED_RESULT;

  constructor(field: string, expectation: string) {
    super(`Stored idempotent result has an invalid "${field}": ${expectation}`, {
      field,
      expectation,
    });
  }
}
