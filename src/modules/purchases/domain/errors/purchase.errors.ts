import { ConflictError, NotFoundError, UnprocessableError } from '../../../../shared/domain/errors';

export const PURCHASE_ERROR_CODE = {
  PRODUCT_NOT_FOUND: 'PRODUCT_NOT_FOUND',
  PRODUCT_ALREADY_SOLD: 'PRODUCT_ALREADY_SOLD',
  ACCOUNT_NOT_FOUND: 'ACCOUNT_NOT_FOUND',
  INSUFFICIENT_FUNDS: 'INSUFFICIENT_FUNDS',
  SELF_PURCHASE_FORBIDDEN: 'SELF_PURCHASE_FORBIDDEN',
  UNSUPPORTED_CURRENCY: 'UNSUPPORTED_CURRENCY',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
} as const;

export class ProductNotFoundError extends NotFoundError {
  public readonly code = PURCHASE_ERROR_CODE.PRODUCT_NOT_FOUND;

  constructor(productId: string) {
    super(`Product ${productId} does not exist`, { productId });
  }
}

export class ProductAlreadySoldError extends ConflictError {
  public readonly code = PURCHASE_ERROR_CODE.PRODUCT_ALREADY_SOLD;

  constructor(productId: string) {
    super(`Product ${productId} has already been sold`, { productId });
  }
}

export class AccountNotFoundError extends NotFoundError {
  public readonly code = PURCHASE_ERROR_CODE.ACCOUNT_NOT_FOUND;

  constructor(userId: string, currency: string) {
    super(`User ${userId} has no ${currency} account`, { userId, currency });
  }
}

export class InsufficientFundsError extends UnprocessableError {
  public readonly code = PURCHASE_ERROR_CODE.INSUFFICIENT_FUNDS;

  constructor(accountId: string, requiredMinorUnits: number, availableMinorUnits: number) {
    super('Buyer balance is not sufficient for this purchase', {
      accountId,
      requiredMinorUnits,
      availableMinorUnits,
    });
  }
}

export class SelfPurchaseForbiddenError extends UnprocessableError {
  public readonly code = PURCHASE_ERROR_CODE.SELF_PURCHASE_FORBIDDEN;

  constructor(userId: string, productId: string) {
    super('Seller cannot buy their own product', { userId, productId });
  }
}

export class UnsupportedCurrencyError extends UnprocessableError {
  public readonly code = PURCHASE_ERROR_CODE.UNSUPPORTED_CURRENCY;

  constructor(expected: string, actual: string) {
    super(`Account currency ${actual} does not match product currency ${expected}`, {
      expected,
      actual,
    });
  }
}

export class UserNotFoundError extends NotFoundError {
  public readonly code = PURCHASE_ERROR_CODE.USER_NOT_FOUND;

  constructor(userId: string) {
    super(`User ${userId} does not exist`, { userId });
  }
}
