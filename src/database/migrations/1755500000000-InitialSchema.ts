import type { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1755500000000 implements MigrationInterface {
  public readonly name = 'InitialSchema1755500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    await queryRunner.query(`
      CREATE TABLE "users" (
        "id"         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
        "email"      varchar(320) NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "uq_users_email" UNIQUE ("email")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "accounts" (
        "id"            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id"       uuid        NOT NULL,
        "currency"      char(3)     NOT NULL,
        "balance_minor" bigint      NOT NULL DEFAULT 0,
        "created_at"    timestamptz NOT NULL DEFAULT now(),
        "updated_at"    timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "fk_accounts_user" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE,
        CONSTRAINT "uq_accounts_user_currency" UNIQUE ("user_id", "currency"),
        CONSTRAINT "ck_accounts_balance_non_negative" CHECK ("balance_minor" >= 0)
      )
    `);

    await queryRunner.query(`CREATE TYPE "product_status" AS ENUM ('AVAILABLE', 'SOLD')`);

    await queryRunner.query(`
      CREATE TABLE "products" (
        "id"          uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
        "seller_id"   uuid           NOT NULL,
        "title"       varchar(255)   NOT NULL,
        "price_minor" bigint         NOT NULL,
        "currency"    char(3)        NOT NULL,
        "status"      product_status NOT NULL DEFAULT 'AVAILABLE',
        "sold_at"     timestamptz    NULL,
        "created_at"  timestamptz    NOT NULL DEFAULT now(),
        "updated_at"  timestamptz    NOT NULL DEFAULT now(),
        CONSTRAINT "fk_products_seller" FOREIGN KEY ("seller_id") REFERENCES "users" ("id") ON DELETE RESTRICT,
        CONSTRAINT "ck_products_price_positive" CHECK ("price_minor" > 0),
        CONSTRAINT "ck_products_sold_at_consistent" CHECK (("status" = 'SOLD') = ("sold_at" IS NOT NULL))
      )
    `);

    await queryRunner.query(`CREATE INDEX "ix_products_seller" ON "products" ("seller_id")`);
    await queryRunner.query(
      `CREATE INDEX "ix_products_available" ON "products" ("created_at") WHERE "status" = 'AVAILABLE'`,
    );

    await queryRunner.query(`
      CREATE TABLE "purchases" (
        "id"           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
        "product_id"   uuid        NOT NULL,
        "buyer_id"     uuid        NOT NULL,
        "seller_id"    uuid        NOT NULL,
        "amount_minor" bigint      NOT NULL,
        "currency"     char(3)     NOT NULL,
        "purchased_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "fk_purchases_product" FOREIGN KEY ("product_id") REFERENCES "products" ("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_purchases_buyer" FOREIGN KEY ("buyer_id") REFERENCES "users" ("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_purchases_seller" FOREIGN KEY ("seller_id") REFERENCES "users" ("id") ON DELETE RESTRICT,
        CONSTRAINT "uq_purchases_product" UNIQUE ("product_id"),
        CONSTRAINT "ck_purchases_amount_positive" CHECK ("amount_minor" > 0),
        CONSTRAINT "ck_purchases_buyer_not_seller" CHECK ("buyer_id" <> "seller_id")
      )
    `);

    await queryRunner.query(`CREATE INDEX "ix_purchases_buyer" ON "purchases" ("buyer_id")`);

    await queryRunner.query(`CREATE TYPE "ledger_direction" AS ENUM ('DEBIT', 'CREDIT')`);

    await queryRunner.query(`
      CREATE TABLE "ledger_entries" (
        "id"           uuid             PRIMARY KEY DEFAULT gen_random_uuid(),
        "purchase_id"  uuid             NOT NULL,
        "account_id"   uuid             NOT NULL,
        "direction"    ledger_direction NOT NULL,
        "amount_minor" bigint           NOT NULL,
        "currency"     char(3)          NOT NULL,
        "created_at"   timestamptz      NOT NULL DEFAULT now(),
        CONSTRAINT "fk_ledger_entries_purchase" FOREIGN KEY ("purchase_id") REFERENCES "purchases" ("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_ledger_entries_account" FOREIGN KEY ("account_id") REFERENCES "accounts" ("id") ON DELETE RESTRICT,
        CONSTRAINT "uq_ledger_entries_purchase_account_direction" UNIQUE ("purchase_id", "account_id", "direction"),
        CONSTRAINT "ck_ledger_entries_amount_positive" CHECK ("amount_minor" > 0)
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "ix_ledger_entries_account" ON "ledger_entries" ("account_id")`,
    );

    await queryRunner.query(`
      CREATE TABLE "idempotency_keys" (
        "id"              uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id"         uuid         NOT NULL,
        "idempotency_key" varchar(255) NOT NULL,
        "resource_id"     uuid         NULL,
        "result"          jsonb        NULL,
        "created_at"      timestamptz  NOT NULL DEFAULT now(),
        "completed_at"    timestamptz  NULL,
        CONSTRAINT "fk_idempotency_keys_user" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE,
        CONSTRAINT "uq_idempotency_keys_user_key" UNIQUE ("user_id", "idempotency_key")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "outbox_messages" (
        "id"             uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
        "aggregate_type" varchar(64)  NOT NULL,
        "aggregate_id"   uuid         NOT NULL,
        "event_type"     varchar(128) NOT NULL,
        "payload"        jsonb        NOT NULL,
        "occurred_at"    timestamptz  NOT NULL DEFAULT now(),
        "published_at"   timestamptz  NULL,
        "attempts"       integer      NOT NULL DEFAULT 0,
        "last_error"     text         NULL,
        CONSTRAINT "ck_outbox_messages_attempts_non_negative" CHECK ("attempts" >= 0)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "ix_outbox_messages_unpublished"
        ON "outbox_messages" ("occurred_at")
        WHERE "published_at" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "outbox_messages"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "idempotency_keys"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "ledger_entries"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "ledger_direction"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "purchases"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "products"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "product_status"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "accounts"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
  }
}
