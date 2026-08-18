/**
 * Names of the constraints the repositories translate into domain errors.
 *
 * Only the ones referenced from code are listed. The migration deliberately keeps literal SQL -
 * a migration is a snapshot of history and must not change meaning when a constant is renamed -
 * so a rename here has to be paired with a new migration.
 */
export const DB_CONSTRAINT = {
  PURCHASES_PRODUCT_UNIQUE: 'uq_purchases_product',
  PURCHASES_BUYER_NOT_SELLER: 'ck_purchases_buyer_not_seller',
  IDEMPOTENCY_USER_FK: 'fk_idempotency_keys_user',
} as const;
