export const LEDGER_DIRECTION = {
  DEBIT: 'DEBIT',
  CREDIT: 'CREDIT',
} as const;

export type LedgerDirection = (typeof LEDGER_DIRECTION)[keyof typeof LEDGER_DIRECTION];
