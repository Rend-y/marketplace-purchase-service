import type { Server } from 'node:http';

import request from 'supertest';
import type { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { createMarketplace } from '../factories/marketplace.factory';
import { truncateAll } from '../setup/database';
import { createTestApp, type TestApp } from '../setup/test-app';

const IDEMPOTENCY_KEY_HEADER = 'idempotency-key';

describe('GET /metrics', () => {
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

  it('exposes the metrics in Prometheus text format', async () => {
    const response = await request(server).get('/metrics').expect(200);

    expect(response.headers['content-type']).toContain('text/plain');
    expect(response.text).toContain('http_requests_total');
    expect(response.text).toContain('http_request_duration_seconds');
    expect(response.text).toContain('purchases_total');
    expect(response.text).toContain('process_cpu_seconds_total');
  });

  it('counts a completed purchase as a business metric', async () => {
    const { buyer, product } = await createMarketplace(dataSource);

    await request(server)
      .post('/purchases')
      .set(IDEMPOTENCY_KEY_HEADER, uuidv4())
      .send({ productId: product.productId, buyerId: buyer.userId })
      .expect(201);

    const response = await request(server).get('/metrics').expect(200);

    expect(response.text).toMatch(/purchases_total\{result="created",reason="none"\} [1-9]/);
  });

  it('counts a rejected purchase with its reason', async () => {
    const { buyer } = await createMarketplace(dataSource);

    await request(server)
      .post('/purchases')
      .set(IDEMPOTENCY_KEY_HEADER, uuidv4())
      .send({ productId: uuidv4(), buyerId: buyer.userId })
      .expect(404);

    const response = await request(server).get('/metrics').expect(200);

    expect(response.text).toMatch(
      /purchases_total\{result="rejected",reason="PRODUCT_NOT_FOUND"\} [1-9]/,
    );
  });

  it('labels HTTP metrics with the route template rather than the concrete path', async () => {
    await request(server).get('/livez').expect(200);

    const response = await request(server).get('/metrics').expect(200);

    expect(response.text).toContain('route="/livez"');
  });
});
