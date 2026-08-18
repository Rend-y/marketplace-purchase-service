import { Injectable } from '@nestjs/common';

import { MetricsService, PURCHASE_METRIC_RESULT } from '../../../../shared/infrastructure/metrics';
import type { PurchaseMetricsPort } from '../../application/ports';

@Injectable()
export class PurchaseMetricsAdapter implements PurchaseMetricsPort {
  constructor(private readonly metrics: MetricsService) {}

  public recordCreated(): void {
    this.metrics.recordPurchase(PURCHASE_METRIC_RESULT.CREATED);
  }

  public recordReplayed(): void {
    this.metrics.recordPurchase(PURCHASE_METRIC_RESULT.REPLAYED);
  }

  public recordRejected(reason: string): void {
    this.metrics.recordPurchase(PURCHASE_METRIC_RESULT.REJECTED, reason);
  }
}
