import { QueryFailedError } from 'typeorm';

export const POSTGRES_ERROR_CODE = {
  UNIQUE_VIOLATION: '23505',
  CHECK_VIOLATION: '23514',
  FOREIGN_KEY_VIOLATION: '23503',
  NOT_NULL_VIOLATION: '23502',
  DEADLOCK_DETECTED: '40P01',
  SERIALIZATION_FAILURE: '40001',
  LOCK_NOT_AVAILABLE: '55P03',
  QUERY_CANCELED: '57014',
} as const;

export type PostgresErrorCode = (typeof POSTGRES_ERROR_CODE)[keyof typeof POSTGRES_ERROR_CODE];

export interface PostgresErrorInfo {
  readonly code: string;
  readonly constraint?: string;
  readonly detail?: string;
}

const readStringProperty = (source: Record<string, unknown>, key: string): string | undefined => {
  const value = source[key];
  return typeof value === 'string' ? value : undefined;
};

/** Extracts the PostgreSQL driver error hidden inside TypeORM's `QueryFailedError`. */
export const toPostgresError = (error: unknown): PostgresErrorInfo | undefined => {
  if (!(error instanceof QueryFailedError)) {
    return undefined;
  }

  const driverError: unknown = error.driverError;

  if (typeof driverError !== 'object' || driverError === null) {
    return undefined;
  }

  const source = driverError as Record<string, unknown>;
  const code = readStringProperty(source, 'code');

  if (code === undefined) {
    return undefined;
  }

  return {
    code,
    constraint: readStringProperty(source, 'constraint'),
    detail: readStringProperty(source, 'detail'),
  };
};

export const isPostgresError = (error: unknown, code: PostgresErrorCode): boolean =>
  toPostgresError(error)?.code === code;

export const isUniqueViolation = (error: unknown, constraint?: string): boolean => {
  const info = toPostgresError(error);

  if (info?.code !== POSTGRES_ERROR_CODE.UNIQUE_VIOLATION) {
    return false;
  }

  return constraint === undefined || info.constraint === constraint;
};

export const isCheckViolation = (error: unknown, constraint?: string): boolean => {
  const info = toPostgresError(error);

  if (info?.code !== POSTGRES_ERROR_CODE.CHECK_VIOLATION) {
    return false;
  }

  return constraint === undefined || info.constraint === constraint;
};
