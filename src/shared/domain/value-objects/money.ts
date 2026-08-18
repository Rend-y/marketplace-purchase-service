import { InvariantViolationError } from '../errors';
import { toCurrencyCode, type CurrencyCode } from './currency';

class InvalidMoneyAmountError extends InvariantViolationError {
  public readonly code = 'INVALID_MONEY_AMOUNT';
}

class CurrencyMismatchError extends InvariantViolationError {
  public readonly code = 'CURRENCY_MISMATCH';

  constructor(left: string, right: string) {
    super(`Cannot operate on ${left} and ${right} amounts`, { left, right });
  }
}

/**
 * Monetary amount stored in minor units (kopecks/cents) as a safe integer.
 * Floating point never touches money, and the database column is `bigint`.
 */
export class Money {
  private constructor(
    public readonly minorUnits: number,
    public readonly currency: CurrencyCode,
  ) {}

  public static of(minorUnits: number, currency: string): Money {
    if (!Number.isSafeInteger(minorUnits)) {
      throw new InvalidMoneyAmountError(
        `Monetary amount must be a safe integer of minor units, received ${String(minorUnits)}`,
        { minorUnits: String(minorUnits) },
      );
    }

    if (minorUnits < 0) {
      throw new InvalidMoneyAmountError(`Monetary amount must not be negative`, { minorUnits });
    }

    return new Money(minorUnits, toCurrencyCode(currency));
  }

  public static zero(currency: string): Money {
    return Money.of(0, currency);
  }

  public add(other: Money): Money {
    this.assertSameCurrency(other);
    return Money.of(this.minorUnits + other.minorUnits, this.currency);
  }

  public subtract(other: Money): Money {
    this.assertSameCurrency(other);
    return Money.of(this.minorUnits - other.minorUnits, this.currency);
  }

  public isGreaterThanOrEqual(other: Money): boolean {
    this.assertSameCurrency(other);
    return this.minorUnits >= other.minorUnits;
  }

  public isPositive(): boolean {
    return this.minorUnits > 0;
  }

  public equals(other: Money): boolean {
    return this.minorUnits === other.minorUnits && this.currency === other.currency;
  }

  public hasSameCurrency(other: Money): boolean {
    return this.currency === other.currency;
  }

  private assertSameCurrency(other: Money): void {
    if (!this.hasSameCurrency(other)) {
      throw new CurrencyMismatchError(this.currency, other.currency);
    }
  }
}
