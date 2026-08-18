export const HEALTH_STATUS = {
  UP: 'up',
  DOWN: 'down',
} as const;

export type HealthStatus = (typeof HEALTH_STATUS)[keyof typeof HEALTH_STATUS];

export interface HealthCheckResult {
  readonly name: string;
  readonly status: HealthStatus;
  readonly detail?: string;
}

export interface HealthIndicatorPort {
  readonly name: string;
  check(): Promise<HealthCheckResult>;
}
