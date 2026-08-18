export interface PurchaseMetricsPort {
  recordCreated(): void;
  recordReplayed(): void;
  recordRejected(reason: string): void;
}
