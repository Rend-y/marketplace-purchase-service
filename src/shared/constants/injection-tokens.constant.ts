export const INJECTION_TOKEN = {
  TRANSACTION_MANAGER: 'TransactionManagerPort',
  CLOCK: 'ClockPort',
  UUID_GENERATOR: 'UuidGeneratorPort',
  MESSAGE_PUBLISHER: 'MessagePublisherPort',

  PRODUCT_REPOSITORY: 'ProductRepositoryPort',
  ACCOUNT_REPOSITORY: 'AccountRepositoryPort',
  PURCHASE_REPOSITORY: 'PurchaseRepositoryPort',
  LEDGER_REPOSITORY: 'LedgerRepositoryPort',
  IDEMPOTENCY_REPOSITORY: 'IdempotencyRepositoryPort',
  OUTBOX_REPOSITORY: 'OutboxRepositoryPort',
  PURCHASE_METRICS: 'PurchaseMetricsPort',
} as const;
