import type { ValueTransformer } from 'typeorm';

/**
 * PostgreSQL `bigint` is returned by the driver as a string to avoid precision loss.
 * Monetary amounts are kept as safe integers of minor units, so the conversion is
 * validated instead of being an implicit `Number()` cast.
 */
export const bigintTransformer: ValueTransformer = {
  to: (value: unknown): string | null => {
    if (value === null || value === undefined) {
      return null;
    }

    if (typeof value !== 'number' || !Number.isSafeInteger(value)) {
      throw new TypeError(
        `Expected a safe integer for a bigint column, received a value of type ${typeof value}`,
      );
    }

    return value.toString();
  },

  from: (value: unknown): number | null => {
    if (value === null || value === undefined) {
      return null;
    }

    const parsed = typeof value === 'number' ? value : Number(value);

    if (!Number.isSafeInteger(parsed)) {
      throw new TypeError(
        `bigint column value ${String(parsed)} exceeds the safe integer range and cannot be used`,
      );
    }

    return parsed;
  },
};
