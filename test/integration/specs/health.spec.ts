import type { Server } from 'node:http';

import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createTestApp, type TestApp } from '../setup/test-app';

describe('probes', () => {
  let testApp: TestApp;
  let server: Server;

  beforeAll(async () => {
    testApp = await createTestApp();
    server = testApp.app.getHttpServer() as Server;
  });

  afterAll(async () => {
    await testApp.close();
  });

  describe('GET /livez', () => {
    it('reports the process as alive with a responsive event loop', async () => {
      const response = await request(server).get('/livez').expect(200);

      const body = response.body as {
        status: string;
        eventLoopLagMs: number;
        thresholdMs: number;
        uptimeSeconds: number;
      };

      expect(body.status).toBe('alive');
      expect(typeof body.eventLoopLagMs).toBe('number');
      expect(typeof body.uptimeSeconds).toBe('number');
      expect(body.eventLoopLagMs).toBeLessThan(body.thresholdMs);
    });
  });

  describe('GET /readyz', () => {
    it('reports every critical dependency as reachable', async () => {
      const response = await request(server).get('/readyz').expect(200);

      expect(response.body.status).toBe('ready');

      const checks = response.body.checks as { name: string; status: string }[];
      const byName = new Map(checks.map((check) => [check.name, check.status]));

      expect(byName.get('database')).toBe('up');
      expect(byName.get('broker')).toBe('up');
      expect(byName.get('shutdown')).toBe('up');
    });
  });

  it('exposes readiness and liveness as separate endpoints instead of a single /health', async () => {
    await request(server).get('/health').expect(404);
  });
});
