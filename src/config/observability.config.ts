import { registerAs } from '@nestjs/config';
import { get } from 'env-var';

export const observabilityConfig = registerAs('observabilityConfig', () => ({
  eventLoopLagThresholdMs: get('EVENT_LOOP_LAG_THRESHOLD_MS').default(500).asIntPositive(),
}));
