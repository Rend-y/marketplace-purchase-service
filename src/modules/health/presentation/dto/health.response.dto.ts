import { ApiProperty } from '@nestjs/swagger';

import { HEALTH_STATUS, type HealthStatus } from '../../application/ports';

export class HealthCheckDto {
  @ApiProperty({ example: 'database' })
  public readonly name: string;

  @ApiProperty({ enum: Object.values(HEALTH_STATUS), example: HEALTH_STATUS.UP })
  public readonly status: HealthStatus;

  @ApiProperty({ required: false, example: 'no active RabbitMQ connection' })
  public readonly detail?: string;
}

export class ReadinessResponseDto {
  @ApiProperty({ enum: ['ready', 'not_ready'], example: 'ready' })
  public readonly status: 'ready' | 'not_ready';

  @ApiProperty({ type: [HealthCheckDto] })
  public readonly checks: HealthCheckDto[];
}

export class LivenessResponseDto {
  @ApiProperty({ enum: ['alive', 'degraded'], example: 'alive' })
  public readonly status: 'alive' | 'degraded';

  @ApiProperty({ example: 3, description: 'p99 event loop delay since the previous probe, ms' })
  public readonly eventLoopLagMs: number;

  @ApiProperty({ example: 500 })
  public readonly thresholdMs: number;

  @ApiProperty({ example: 1284 })
  public readonly uptimeSeconds: number;
}
