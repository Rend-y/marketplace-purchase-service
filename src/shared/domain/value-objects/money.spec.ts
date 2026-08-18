import { describe, expect, it } from 'vitest';

import { Money } from './money';

const RUB = 'RUB';
const USD = 'USD';

describe('Money', () => {
  it('creates an amount from minor units', () => {
    const money = Money.of(150_000, RUB);

    expect(money.minorUnits).toBe(150_000);
    expect(money.currency).toBe(RUB);
  });

  it('rejects a negative amount', () => {
    expect(() => Money.of(-1, RUB)).toThrow(/must not be negative/);
  });

  it('rejects a fractional amount, because minor units are indivisible', () => {
    expect(() => Money.of(10.5, RUB)).toThrow(/safe integer/);
  });

  it('rejects an amount outside the safe integer range', () => {
    expect(() => Money.of(Number.MAX_SAFE_INTEGER + 2, RUB)).toThrow(/safe integer/);
  });

  it('rejects a malformed currency code', () => {
    expect(() => Money.of(100, 'rub')).toThrow(/ISO-4217/);
    expect(() => Money.of(100, 'RUBLE')).toThrow(/ISO-4217/);
  });

  it('adds and subtracts amounts of the same currency', () => {
    const result = Money.of(1_000, RUB).add(Money.of(500, RUB)).subtract(Money.of(200, RUB));

    expect(result.minorUnits).toBe(1_300);
  });

  it('refuses to mix currencies', () => {
    expect(() => Money.of(1_000, RUB).add(Money.of(1, USD))).toThrow(/Cannot operate/);
  });

  it('refuses to produce a negative result', () => {
    expect(() => Money.of(100, RUB).subtract(Money.of(101, RUB))).toThrow(/must not be negative/);
  });

  it('compares amounts', () => {
    expect(Money.of(100, RUB).isGreaterThanOrEqual(Money.of(100, RUB))).toBe(true);
    expect(Money.of(99, RUB).isGreaterThanOrEqual(Money.of(100, RUB))).toBe(false);
    expect(Money.of(0, RUB).isPositive()).toBe(false);
  });
});
