/**
 * Key under which the active `EntityManager` is published into the async local storage.
 *
 * The CLS store is intentionally left untyped for this entry: TypeORM's `EntityManager` is a very
 * large structural type, and threading it through the generic store blows up type instantiation.
 * Access is funnelled through `TypeormRepository`/`TypeormTransactionManager`, which cast once.
 */
export const TRANSACTION_CLS_KEY = 'transactionEntityManager' as const;
