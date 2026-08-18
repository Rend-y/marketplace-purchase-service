export const DOMAIN_ERROR_KIND = {
  /** The referenced aggregate does not exist. */
  NOT_FOUND: 'NOT_FOUND',
  /** The operation contradicts the current state of an aggregate. */
  CONFLICT: 'CONFLICT',
  /** The request is well-formed but violates a business rule. */
  UNPROCESSABLE: 'UNPROCESSABLE',
  /** A state that should be unreachable was observed. */
  INVARIANT_VIOLATION: 'INVARIANT_VIOLATION',
} as const;

export type DomainErrorKind = (typeof DOMAIN_ERROR_KIND)[keyof typeof DOMAIN_ERROR_KIND];

export type DomainErrorDetails = Readonly<Record<string, string | number | boolean | null>>;

/**
 * Base class for every expected business failure.
 *
 * Errors describe *domain* semantics (not found / conflict / unprocessable); the mapping
 * onto HTTP status codes lives in the presentation layer, so the domain stays transport-agnostic.
 */
export abstract class DomainError extends Error {
  public abstract readonly kind: DomainErrorKind;
  public abstract readonly code: string;
  public readonly details: DomainErrorDetails;

  public constructor(message: string, details: DomainErrorDetails = {}) {
    super(message);
    this.name = new.target.name;
    this.details = details;
    Error.captureStackTrace(this, new.target);
  }
}

export abstract class NotFoundError extends DomainError {
  public readonly kind = DOMAIN_ERROR_KIND.NOT_FOUND;
}

export abstract class ConflictError extends DomainError {
  public readonly kind = DOMAIN_ERROR_KIND.CONFLICT;
}

export abstract class UnprocessableError extends DomainError {
  public readonly kind = DOMAIN_ERROR_KIND.UNPROCESSABLE;
}

export abstract class InvariantViolationError extends DomainError {
  public readonly kind = DOMAIN_ERROR_KIND.INVARIANT_VIOLATION;
}
