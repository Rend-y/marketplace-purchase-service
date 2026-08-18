import type { Server } from 'node:http';

import * as amqp from 'amqplib';
import type { ChannelModel, ConfirmChannel } from 'amqplib';
import request from 'supertest';
import type { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { OutboxMessageOrmEntity } from '../../../src/shared/infrastructure/outbox';
import { createMarketplace, DEFAULT_PRICE_MINOR } from '../factories/marketplace.factory';
import { truncateAll } from '../setup/database';
import { createTestApp, type TestApp } from '../setup/test-app';

const IDEMPOTENCY_KEY_HEADER = 'idempotency-key';
const EXCHANGE = 'marketplace.events';
const ROUTING_KEY = 'purchase.completed';
const CONSUME_TIMEOUT_MS = 10_000;
const POLL_INTERVAL_MS = 50;

interface PurchaseCompletedEnvelope {
  readonly eventId: string;
  readonly eventType: string;
  readonly eventVersion: number;
  readonly occurredAt: string;
  readonly data: {
    readonly purchaseId: string;
    readonly productId: string;
    readonly buyerId: string;
    readonly sellerId: string;
    readonly amount: { readonly minorUnits: number; readonly currency: string };
    readonly purchasedAt: string;
  };
}

describe('outbox relay', () => {
  let testApp: TestApp;
  let dataSource: DataSource;
  let server: Server;
  let connection: ChannelModel;
  let channel: ConfirmChannel;
  let queueName: string;

  beforeAll(async () => {
    testApp = await createTestApp();
    dataSource = testApp.dataSource;
    server = testApp.app.getHttpServer() as Server;

    connection = await amqp.connect(process.env.RABBITMQ_URL ?? '');
    channel = await connection.createConfirmChannel();
    await channel.assertExchange(EXCHANGE, 'topic', { durable: true });

    const queue = await channel.assertQueue('', { exclusive: true });
    queueName = queue.queue;
    await channel.bindQueue(queueName, EXCHANGE, ROUTING_KEY);
  });

  afterAll(async () => {
    await channel.close();
    await connection.close();
    await testApp.close();
  });

  beforeEach(async () => {
    await truncateAll(dataSource);
    await channel.purgeQueue(queueName);
  });

  const consumeOne = async (): Promise<PurchaseCompletedEnvelope> => {
    const deadline = Date.now() + CONSUME_TIMEOUT_MS;

    while (Date.now() < deadline) {
      const message = await channel.get(queueName, { noAck: true });

      if (message !== false) {
        return JSON.parse(message.content.toString('utf-8')) as PurchaseCompletedEnvelope;
      }

      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    }

    throw new Error(`No message arrived on ${queueName} within ${CONSUME_TIMEOUT_MS}ms`);
  };

  it('publishes the purchase event to RabbitMQ and marks the row as published', async () => {
    const { buyer, seller, product } = await createMarketplace(dataSource);

    const purchase = await request(server)
      .post('/purchases')
      .set(IDEMPOTENCY_KEY_HEADER, uuidv4())
      .send({ productId: product.productId, buyerId: buyer.userId })
      .expect(201);

    const published = await testApp.outboxRelay.drainOnce();
    expect(published).toBe(1);

    const envelope = await consumeOne();

    expect(envelope).toMatchObject({
      eventType: ROUTING_KEY,
      eventVersion: 1,
      data: {
        purchaseId: purchase.body.id,
        productId: product.productId,
        buyerId: buyer.userId,
        sellerId: seller.userId,
        amount: { minorUnits: DEFAULT_PRICE_MINOR, currency: 'RUB' },
      },
    });

    const rows = await dataSource.getRepository(OutboxMessageOrmEntity).find();
    expect(rows).toHaveLength(1);
    expect(rows[0]?.publishedAt).not.toBeNull();
    expect(rows[0]?.lastError).toBeNull();
  });

  it('publishes every pending message once and leaves nothing behind', async () => {
    const first = await createMarketplace(dataSource);
    const second = await createMarketplace(dataSource);

    for (const marketplace of [first, second]) {
      await request(server)
        .post('/purchases')
        .set(IDEMPOTENCY_KEY_HEADER, uuidv4())
        .send({ productId: marketplace.product.productId, buyerId: marketplace.buyer.userId })
        .expect(201);
    }

    expect(await testApp.outboxRelay.drainOnce()).toBe(2);
    // A second drain finds nothing: published rows are never picked up again.
    expect(await testApp.outboxRelay.drainOnce()).toBe(0);

    const rows = await dataSource.getRepository(OutboxMessageOrmEntity).find();
    expect(rows).toHaveLength(2);
    expect(rows.every((row) => row.publishedAt !== null)).toBe(true);
  });

  it('does not enqueue a second event for a replayed idempotent request', async () => {
    const { buyer, product } = await createMarketplace(dataSource);
    const idempotencyKey = uuidv4();

    for (let attempt = 0; attempt < 2; attempt += 1) {
      await request(server)
        .post('/purchases')
        .set(IDEMPOTENCY_KEY_HEADER, idempotencyKey)
        .send({ productId: product.productId, buyerId: buyer.userId })
        .expect(201);
    }

    expect(await testApp.outboxRelay.drainOnce()).toBe(1);
    expect(await dataSource.getRepository(OutboxMessageOrmEntity).count()).toBe(1);
  });
});
