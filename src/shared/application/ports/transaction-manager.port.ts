/**
 * Explicit transaction boundary for the application layer.
 *
 * The implementation propagates the active persistence context implicitly (async local storage),
 * so use cases never pass connections/managers around and stay free of persistence details.
 */
export interface TransactionManagerPort {
  runInTransaction<TResult>(work: () => Promise<TResult>): Promise<TResult>;
}
