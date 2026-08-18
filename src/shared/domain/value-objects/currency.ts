import { InvariantViolationError } from '../errors';

const CURRENCY_CODE_PATTERN = /^[A-Z]{3}$/;

class InvalidCurrencyError extends InvariantViolationError {
  public readonly code = 'INVALID_CURRENCY';

  constructor(value: string) {
    super(`Currency must be an ISO-4217 alpha-3 code, received "${value}"`, { value });
  }
}

/** Nominal type: a plain string cannot be used where a validated currency code is expected. */
export type CurrencyCode = string & { readonly __brand: 'CurrencyCode' };

export const toCurrencyCode = (value: string): CurrencyCode => {
  if (!CURRENCY_CODE_PATTERN.test(value)) {
    throw new InvalidCurrencyError(value);
  }

  return value as CurrencyCode;
};
