import { Injectable } from '@nestjs/common';
import { collectDefaultMetrics, Counter, Gauge, Histogram, Registry } from 'prom-client';

import { METRIC_NAME, type PurchaseMetricResult } from './metric-names.constant';

const DURATION_BUCKETS_SECONDS = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5];

export interface HttpRequestLabels {
  readonly method: string;
  readonly route: string;
  readonly statusCode: number;
}

@Injectable()
export class MetricsService {
  private readonly registry = new Registry();

  private readonly httpRequestsTotal: Counter<'method' | 'route' | 'status_code'>;
  private readonly httpRequestDuration: Histogram<'method' | 'route' | 'status_code'>;
  private readonly httpRequestsInFlight: Gauge<'method'>;
  private readonly purchasesTotal: Counter<'result' | 'reason'>;
  private readonly outboxPublishedTotal: Counter<'event_type'>;
  private readonly outboxPublishFailuresTotal: Counter<'event_type'>;
  private readonly outboxPendingMessages: Gauge;

  constructor() {
    collectDefaultMetrics({ register: this.registry });

    this.httpRequestsTotal = new Counter({
      name: METRIC_NAME.HTTP_REQUESTS_TOTAL,
      help: 'Total number of handled HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.registry],
    });

    this.httpRequestDuration = new Histogram({
      name: METRIC_NAME.HTTP_REQUEST_DURATION_SECONDS,
      help: 'HTTP request latency in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: DURATION_BUCKETS_SECONDS,
      registers: [this.registry],
    });

    this.httpRequestsInFlight = new Gauge({
      name: METRIC_NAME.HTTP_REQUESTS_IN_FLIGHT,
      help: 'Number of HTTP requests currently being processed',
      labelNames: ['method'],
      registers: [this.registry],
    });

    this.purchasesTotal = new Counter({
      name: METRIC_NAME.PURCHASES_TOTAL,
      help: 'Purchase attempts by outcome',
      labelNames: ['result', 'reason'],
      registers: [this.registry],
    });

    this.outboxPublishedTotal = new Counter({
      name: METRIC_NAME.OUTBOX_MESSAGES_PUBLISHED_TOTAL,
      help: 'Outbox messages successfully published to the broker',
      labelNames: ['event_type'],
      registers: [this.registry],
    });

    this.outboxPublishFailuresTotal = new Counter({
      name: METRIC_NAME.OUTBOX_PUBLISH_FAILURES_TOTAL,
      help: 'Outbox publish attempts that failed',
      labelNames: ['event_type'],
      registers: [this.registry],
    });

    this.outboxPendingMessages = new Gauge({
      name: METRIC_NAME.OUTBOX_PENDING_MESSAGES,
      help: 'Outbox messages awaiting publication',
      registers: [this.registry],
    });
  }

  public startHttpRequest(method: string): void {
    this.httpRequestsInFlight.inc({ method });
  }

  public observeHttpRequest(labels: HttpRequestLabels, durationSeconds: number): void {
    const promLabels = {
      method: labels.method,
      route: labels.route,
      status_code: labels.statusCode,
    };

    this.httpRequestsInFlight.dec({ method: labels.method });
    this.httpRequestsTotal.inc(promLabels);
    this.httpRequestDuration.observe(promLabels, durationSeconds);
  }

  public recordPurchase(result: PurchaseMetricResult, reason = 'none'): void {
    this.purchasesTotal.inc({ result, reason });
  }

  public recordOutboxPublished(eventType: string): void {
    this.outboxPublishedTotal.inc({ event_type: eventType });
  }

  public recordOutboxPublishFailure(eventType: string): void {
    this.outboxPublishFailuresTotal.inc({ event_type: eventType });
  }

  public setOutboxPending(count: number): void {
    this.outboxPendingMessages.set(count);
  }

  public get contentType(): string {
    return this.registry.contentType;
  }

  public render(): Promise<string> {
    return this.registry.metrics();
  }
}
