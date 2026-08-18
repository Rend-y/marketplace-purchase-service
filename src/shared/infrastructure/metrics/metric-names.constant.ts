export const METRIC_NAME = {
  HTTP_REQUESTS_TOTAL: 'http_requests_total',
  HTTP_REQUEST_DURATION_SECONDS: 'http_request_duration_seconds',
  HTTP_REQUESTS_IN_FLIGHT: 'http_requests_in_flight',
  PURCHASES_TOTAL: 'purchases_total',
  OUTBOX_MESSAGES_PUBLISHED_TOTAL: 'outbox_messages_published_total',
  OUTBOX_PUBLISH_FAILURES_TOTAL: 'outbox_publish_failures_total',
  OUTBOX_PENDING_MESSAGES: 'outbox_pending_messages',
} as const;

export const PURCHASE_METRIC_RESULT = {
  CREATED: 'created',
  REPLAYED: 'replayed',
  REJECTED: 'rejected',
} as const;

export type PurchaseMetricResult =
  (typeof PURCHASE_METRIC_RESULT)[keyof typeof PURCHASE_METRIC_RESULT];
