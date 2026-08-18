import type { DataSource } from 'typeorm';

/** Child tables first is not required with CASCADE, but it documents the dependency order. */
const TABLES = [
  'ledger_entries',
  'purchases',
  'idempotency_keys',
  'outbox_messages',
  'products',
  'accounts',
  'users',
] as const;

export type TableName = (typeof TABLES)[number];

/** Keeps every test independent of the ones before it. */
export const truncateAll = async (dataSource: DataSource): Promise<void> => {
  const tables = TABLES.map((table) => `"${table}"`).join(', ');

  await dataSource.query(`TRUNCATE TABLE ${tables} RESTART IDENTITY CASCADE`);
};

export const countRows = async (dataSource: DataSource, table: TableName): Promise<number> => {
  const rows: unknown = await dataSource.query(`SELECT COUNT(*)::int AS count FROM "${table}"`);

  if (!Array.isArray(rows) || rows.length === 0) {
    return 0;
  }

  const [first] = rows as { count: number }[];

  return first.count;
};
