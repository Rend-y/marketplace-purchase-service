import { Money } from '../../../../shared/domain/value-objects';
import { InsufficientFundsError } from '../errors';

export interface AccountSnapshot {
  readonly id: string;
  readonly userId: string;
  readonly balance: Money;
}

export class Account {
  private constructor(
    public readonly id: string,
    public readonly userId: string,
    private currentBalance: Money,
  ) {}

  public static restore(snapshot: AccountSnapshot): Account {
    return new Account(snapshot.id, snapshot.userId, snapshot.balance);
  }

  public get balance(): Money {
    return this.currentBalance;
  }

  public get currency(): string {
    return this.currentBalance.currency;
  }

  public canAfford(amount: Money): boolean {
    return this.currentBalance.isGreaterThanOrEqual(amount);
  }

  public withdraw(amount: Money): void {
    if (!this.canAfford(amount)) {
      throw new InsufficientFundsError(this.id, amount.minorUnits, this.currentBalance.minorUnits);
    }

    this.currentBalance = this.currentBalance.subtract(amount);
  }

  public deposit(amount: Money): void {
    this.currentBalance = this.currentBalance.add(amount);
  }

  public static openFor(id: string, userId: string, currency: string): Account {
    return new Account(id, userId, Money.zero(currency));
  }
}
