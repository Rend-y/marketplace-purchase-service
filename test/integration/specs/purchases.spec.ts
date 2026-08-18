import type { Server } from 'node:http';

import request from 'supertest';
import type { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import {
  LedgerEntryOrmEntity,
  PurchaseOrmEntity,
} from '../../../src/modules/purchases/infrastructure/persistence/entities';
import { OutboxMessageOrmEntity } from '../../../src/shared/infrastructure/outbox';
import {
  createMarketplace,
  createProduct,
  createUser,
  DEFAULT_BALANCE_MINOR,
  DEFAULT_PRICE_MINOR,
  readAccountBalance,
  readProduct,
} from '../factories/marketplace.factory';
import { countRows, truncateAll } from '../setup/database';
import { createTestApp, type TestApp } from '../setup/test-app';

const IDEMPOTENCY_KEY_HEADER = 'idempotency-key';
const REQUEST_ID_HEADER = 'x-request-id';
const REPLAY_HEADER = 'idempotent-replay';

const CONCURRENT_BUYERS = 20;
const CONCURRENT_DUPLICATES = 10;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

describe('POST /purchases', () => {
  let testApp: TestApp;
  let dataSource: DataSource;
  let server: Server;

  beforeAll(async () => {
    testApp = await createTestApp();
    dataSource = testApp.dataSource;
    server = testApp.app.getHttpServer() as Server;
  });

  afterAll(async () => {
    await testApp.close();
  });

  beforeEach(async () => {
    await truncateAll(dataSource);
  });

  describe('happy path', () => {
    it('transfers the money, marks the product as sold and records a double entry', async () => {
      const { buyer, seller, product } = await createMarketplace(dataSource);

      const response = await request(server)
        .post('/purchases')
        .set(IDEMPOTENCY_KEY_HEADER, uuidv4())
        .send({ productId: product.productId, buyerId: buyer.userId })
        .expect(201);

      expect(response.body).toMatchObject({
        productId: product.productId,
        buyerId: buyer.userId,
        sellerId: seller.userId,
        amountMinorUnits: DEFAULT_PRICE_MINOR,
        currency: 'RUB',
      });
      expect(response.body.id).toMatch(UUID_PATTERN);
      expect(response.headers[REPLAY_HEADER]).toBe('false');

      expect(await readAccountBalance(dataSource, buyer.accountId)).toBe(
        DEFAULT_BALANCE_MINOR - DEFAULT_PRICE_MINOR,
      );
      expect(await readAccountBalance(dataSource, seller.accountId)).toBe(DEFAULT_PRICE_MINOR);

      const storedProduct = await readProduct(dataSource, product.productId);
      expect(storedProduct.status).toBe('SOLD');
      expect(storedProduct.soldAt).not.toBeNull();

      const entries = await dataSource.getRepository(LedgerEntryOrmEntity).find();
      expect(entries).toHaveLength(2);
      expect(entries.filter((entry) => entry.direction === 'DEBIT')).toHaveLength(1);
      expect(entries.filter((entry) => entry.direction === 'CREDIT')).toHaveLength(1);
      expect(entries.every((entry) => entry.amountMinor === DEFAULT_PRICE_MINOR)).toBe(true);
    });

    it('stores the purchase with the price captured under the row lock', async () => {
      const { buyer, seller, product } = await createMarketplace(dataSource);

      const response = await request(server)
        .post('/purchases')
        .set(IDEMPOTENCY_KEY_HEADER, uuidv4())
        .send({ productId: product.productId, buyerId: buyer.userId })
        .expect(201);

      const stored = await dataSource
        .getRepository(PurchaseOrmEntity)
        .findOneOrFail({ where: { id: response.body.id as string } });

      expect(stored).toMatchObject({
        productId: product.productId,
        buyerId: buyer.userId,
        sellerId: seller.userId,
        amountMinor: DEFAULT_PRICE_MINOR,
        currency: 'RUB',
      });
    });

    it('appends exactly one unpublished integration event to the outbox', async () => {
      const { buyer, product } = await createMarketplace(dataSource);

      const response = await request(server)
        .post('/purchases')
        .set(IDEMPOTENCY_KEY_HEADER, uuidv4())
        .send({ productId: product.productId, buyerId: buyer.userId })
        .expect(201);

      const messages = await dataSource.getRepository(OutboxMessageOrmEntity).find();

      expect(messages).toHaveLength(1);
      expect(messages[0]).toMatchObject({
        eventType: 'purchase.completed',
        aggregateType: 'purchase',
        aggregateId: response.body.id,
        publishedAt: null,
        attempts: 0,
      });
    });
  });

  describe('idempotency', () => {
    it('replays the stored response instead of buying twice', async () => {
      const { buyer, product } = await createMarketplace(dataSource);
      const idempotencyKey = uuidv4();

      const first = await request(server)
        .post('/purchases')
        .set(IDEMPOTENCY_KEY_HEADER, idempotencyKey)
        .send({ productId: product.productId, buyerId: buyer.userId })
        .expect(201);

      const second = await request(server)
        .post('/purchases')
        .set(IDEMPOTENCY_KEY_HEADER, idempotencyKey)
        .send({ productId: product.productId, buyerId: buyer.userId })
        .expect(201);

      expect(second.body).toEqual(first.body);
      expect(second.headers[REPLAY_HEADER]).toBe('true');

      expect(await countRows(dataSource, 'purchases')).toBe(1);
      expect(await countRows(dataSource, 'ledger_entries')).toBe(2);
      expect(await countRows(dataSource, 'outbox_messages')).toBe(1);
      expect(await readAccountBalance(dataSource, buyer.accountId)).toBe(
        DEFAULT_BALANCE_MINOR - DEFAULT_PRICE_MINOR,
      );
    });

    it('creates a single purchase when the same key arrives concurrently', async () => {
      const { buyer, product } = await createMarketplace(dataSource);
      const idempotencyKey = uuidv4();

      const responses = await Promise.all(
        Array.from({ length: CONCURRENT_DUPLICATES }, () =>
          request(server)
            .post('/purchases')
            .set(IDEMPOTENCY_KEY_HEADER, idempotencyKey)
            .send({ productId: product.productId, buyerId: buyer.userId }),
        ),
      );

      expect(responses.every((response) => response.status === 201)).toBe(true);

      const purchaseIds = new Set(responses.map((response) => response.body.id as string));
      expect(purchaseIds.size).toBe(1);

      expect(await countRows(dataSource, 'purchases')).toBe(1);
      expect(await countRows(dataSource, 'outbox_messages')).toBe(1);
      expect(await readAccountBalance(dataSource, buyer.accountId)).toBe(
        DEFAULT_BALANCE_MINOR - DEFAULT_PRICE_MINOR,
      );
    });

    it('does not consume the key when the attempt failed, so a retry can still succeed', async () => {
      const { buyer, product } = await createMarketplace(dataSource);
      const idempotencyKey = uuidv4();

      await request(server)
        .post('/purchases')
        .set(IDEMPOTENCY_KEY_HEADER, idempotencyKey)
        .send({ productId: uuidv4(), buyerId: buyer.userId })
        .expect(404);

      expect(await countRows(dataSource, 'idempotency_keys')).toBe(0);

      await request(server)
        .post('/purchases')
        .set(IDEMPOTENCY_KEY_HEADER, idempotencyKey)
        .send({ productId: product.productId, buyerId: buyer.userId })
        .expect(201);
    });

    it('scopes keys per buyer, so two buyers may reuse the same key value', async () => {
      const seller = await createUser(dataSource, { balanceMinor: 0 });
      const firstBuyer = await createUser(dataSource);
      const secondBuyer = await createUser(dataSource);
      const firstProduct = await createProduct(dataSource, seller.userId);
      const secondProduct = await createProduct(dataSource, seller.userId);
      const sharedKey = 'shared-idempotency-key';

      await request(server)
        .post('/purchases')
        .set(IDEMPOTENCY_KEY_HEADER, sharedKey)
        .send({ productId: firstProduct.productId, buyerId: firstBuyer.userId })
        .expect(201);

      await request(server)
        .post('/purchases')
        .set(IDEMPOTENCY_KEY_HEADER, sharedKey)
        .send({ productId: secondProduct.productId, buyerId: secondBuyer.userId })
        .expect(201);

      expect(await countRows(dataSource, 'purchases')).toBe(2);
    });
  });

  describe('concurrency', () => {
    it('sells a product to exactly one of many simultaneous buyers', async () => {
      const seller = await createUser(dataSource, { balanceMinor: 0 });
      const product = await createProduct(dataSource, seller.userId);

      const buyers = await Promise.all(
        Array.from({ length: CONCURRENT_BUYERS }, () => createUser(dataSource)),
      );

      const responses = await Promise.all(
        buyers.map((buyer) =>
          request(server)
            .post('/purchases')
            .set(IDEMPOTENCY_KEY_HEADER, uuidv4())
            .send({ productId: product.productId, buyerId: buyer.userId }),
        ),
      );

      const created = responses.filter((response) => response.status === 201);
      const conflicted = responses.filter((response) => response.status === 409);

      expect(created).toHaveLength(1);
      expect(conflicted).toHaveLength(CONCURRENT_BUYERS - 1);
      expect(conflicted.every((response) => response.body.code === 'PRODUCT_ALREADY_SOLD')).toBe(
        true,
      );

      expect(await countRows(dataSource, 'purchases')).toBe(1);
      expect(await countRows(dataSource, 'ledger_entries')).toBe(2);
      expect(await countRows(dataSource, 'outbox_messages')).toBe(1);

      expect((await readProduct(dataSource, product.productId)).status).toBe('SOLD');
      expect(await readAccountBalance(dataSource, seller.accountId)).toBe(DEFAULT_PRICE_MINOR);
    });

    it('never lets a buyer overspend across simultaneous purchases', async () => {
      const seller = await createUser(dataSource, { balanceMinor: 0 });
      const buyer = await createUser(dataSource, { balanceMinor: DEFAULT_PRICE_MINOR });

      const products = await Promise.all(
        Array.from({ length: 5 }, () => createProduct(dataSource, seller.userId)),
      );

      const responses = await Promise.all(
        products.map((product) =>
          request(server)
            .post('/purchases')
            .set(IDEMPOTENCY_KEY_HEADER, uuidv4())
            .send({ productId: product.productId, buyerId: buyer.userId }),
        ),
      );

      const created = responses.filter((response) => response.status === 201);

      // The balance covers exactly one product, so the account lock must reject the rest.
      expect(created).toHaveLength(1);
      expect(await countRows(dataSource, 'purchases')).toBe(1);
      expect(await readAccountBalance(dataSource, buyer.accountId)).toBe(0);
      expect(await readAccountBalance(dataSource, seller.accountId)).toBe(DEFAULT_PRICE_MINOR);
    });
  });

  describe('business rule violations', () => {
    it('rejects a purchase the buyer cannot afford', async () => {
      const { buyer, product } = await createMarketplace(dataSource, {
        buyerBalanceMinor: DEFAULT_PRICE_MINOR - 1,
      });

      const response = await request(server)
        .post('/purchases')
        .set(IDEMPOTENCY_KEY_HEADER, uuidv4())
        .send({ productId: product.productId, buyerId: buyer.userId })
        .expect(422);

      expect(response.body).toMatchObject({ statusCode: 422, code: 'INSUFFICIENT_FUNDS' });

      expect(await countRows(dataSource, 'purchases')).toBe(0);
      expect(await countRows(dataSource, 'outbox_messages')).toBe(0);
      expect(await readAccountBalance(dataSource, buyer.accountId)).toBe(DEFAULT_PRICE_MINOR - 1);
      expect((await readProduct(dataSource, product.productId)).status).toBe('AVAILABLE');
    });

    it('rejects a seller buying their own product', async () => {
      const { seller, product } = await createMarketplace(dataSource);

      const response = await request(server)
        .post('/purchases')
        .set(IDEMPOTENCY_KEY_HEADER, uuidv4())
        .send({ productId: product.productId, buyerId: seller.userId })
        .expect(422);

      expect(response.body.code).toBe('SELF_PURCHASE_FORBIDDEN');
      expect(await countRows(dataSource, 'purchases')).toBe(0);
    });

    it('rejects a second purchase of an already sold product', async () => {
      const { buyer, product } = await createMarketplace(dataSource);
      const otherBuyer = await createUser(dataSource);

      await request(server)
        .post('/purchases')
        .set(IDEMPOTENCY_KEY_HEADER, uuidv4())
        .send({ productId: product.productId, buyerId: buyer.userId })
        .expect(201);

      const response = await request(server)
        .post('/purchases')
        .set(IDEMPOTENCY_KEY_HEADER, uuidv4())
        .send({ productId: product.productId, buyerId: otherBuyer.userId })
        .expect(409);

      expect(response.body.code).toBe('PRODUCT_ALREADY_SOLD');
      expect(await readAccountBalance(dataSource, otherBuyer.accountId)).toBe(
        DEFAULT_BALANCE_MINOR,
      );
    });

    it('rejects an unknown product', async () => {
      const buyer = await createUser(dataSource);

      const response = await request(server)
        .post('/purchases')
        .set(IDEMPOTENCY_KEY_HEADER, uuidv4())
        .send({ productId: uuidv4(), buyerId: buyer.userId })
        .expect(404);

      expect(response.body.code).toBe('PRODUCT_NOT_FOUND');
    });

    it('rejects an unknown buyer', async () => {
      const { product } = await createMarketplace(dataSource);

      const response = await request(server)
        .post('/purchases')
        .set(IDEMPOTENCY_KEY_HEADER, uuidv4())
        .send({ productId: product.productId, buyerId: uuidv4() })
        .expect(404);

      expect(response.body.code).toBe('USER_NOT_FOUND');
    });

    it('rejects a buyer without an account in the product currency', async () => {
      const seller = await createUser(dataSource, { balanceMinor: 0 });
      const buyer = await createUser(dataSource, { currency: 'USD' });
      const product = await createProduct(dataSource, seller.userId);

      const response = await request(server)
        .post('/purchases')
        .set(IDEMPOTENCY_KEY_HEADER, uuidv4())
        .send({ productId: product.productId, buyerId: buyer.userId })
        .expect(404);

      expect(response.body.code).toBe('ACCOUNT_NOT_FOUND');
    });
  });

  describe('request validation', () => {
    it('requires the idempotency key header', async () => {
      const { buyer, product } = await createMarketplace(dataSource);

      const response = await request(server)
        .post('/purchases')
        .send({ productId: product.productId, buyerId: buyer.userId })
        .expect(400);

      expect(response.body.code).toBe('IDEMPOTENCY_KEY_REQUIRED');
    });

    it('rejects an idempotency key that is too short', async () => {
      const { buyer, product } = await createMarketplace(dataSource);

      const response = await request(server)
        .post('/purchases')
        .set(IDEMPOTENCY_KEY_HEADER, 'short')
        .send({ productId: product.productId, buyerId: buyer.userId })
        .expect(400);

      expect(response.body.code).toBe('IDEMPOTENCY_KEY_INVALID');
    });

    it('rejects a malformed body', async () => {
      const response = await request(server)
        .post('/purchases')
        .set(IDEMPOTENCY_KEY_HEADER, uuidv4())
        .send({ productId: 'not-a-uuid', buyerId: uuidv4() })
        .expect(400);

      expect(response.body.code).toBe('VALIDATION_FAILED');
      expect(response.body.details.violations).toEqual(
        expect.arrayContaining([expect.stringContaining('productId')]),
      );
    });

    it('rejects unknown properties instead of silently ignoring them', async () => {
      const { buyer, product } = await createMarketplace(dataSource);

      const response = await request(server)
        .post('/purchases')
        .set(IDEMPOTENCY_KEY_HEADER, uuidv4())
        .send({ productId: product.productId, buyerId: buyer.userId, amountMinorUnits: 1 })
        .expect(400);

      expect(response.body.code).toBe('VALIDATION_FAILED');
    });
  });

  describe('error contract', () => {
    it('echoes the supplied request id and keeps the error shape stable', async () => {
      const buyer = await createUser(dataSource);
      const requestId = uuidv4();

      const response = await request(server)
        .post('/purchases')
        .set(IDEMPOTENCY_KEY_HEADER, uuidv4())
        .set(REQUEST_ID_HEADER, requestId)
        .send({ productId: uuidv4(), buyerId: buyer.userId })
        .expect(404);

      expect(response.body).toMatchObject({
        statusCode: 404,
        code: 'PRODUCT_NOT_FOUND',
        requestId,
        path: '/purchases',
      });
      expect(typeof response.body.message).toBe('string');
      expect(typeof response.body.timestamp).toBe('string');
    });

    it('generates a request id when the caller does not supply one', async () => {
      const buyer = await createUser(dataSource);

      const response = await request(server)
        .post('/purchases')
        .set(IDEMPOTENCY_KEY_HEADER, uuidv4())
        .send({ productId: uuidv4(), buyerId: buyer.userId })
        .expect(404);

      expect(response.body.requestId).toMatch(UUID_PATTERN);
    });
  });
});
