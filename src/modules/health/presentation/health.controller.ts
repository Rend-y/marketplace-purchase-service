import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';

import { LivenessService, ReadinessService } from '../application/services';
import { LivenessResponseDto, ReadinessResponseDto } from './dto';
import { ApiLivenessProbe, ApiReadinessProbe } from './swagger';

/**
 * Deliberately split into two probes instead of a single `/health`: readiness and liveness answer
 * different questions and must be able to fail independently.
 */
@ApiTags('health')
@Controller()
export class HealthController {
  constructor(
    private readonly readiness: ReadinessService,
    private readonly liveness: LivenessService,
  ) {}

  @Get('readyz')
  @ApiReadinessProbe()
  public async ready(
    @Res({ passthrough: true }) response: Response,
  ): Promise<ReadinessResponseDto> {
    const report = await this.readiness.check();

    response.status(report.ready ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE);

    return {
      status: report.ready ? 'ready' : 'not_ready',
      checks: report.checks.map((check) => ({ ...check })),
    };
  }

  @Get('livez')
  @ApiLivenessProbe()
  public live(@Res({ passthrough: true }) response: Response): LivenessResponseDto {
    const report = this.liveness.check();

    response.status(report.alive ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE);

    return {
      status: report.alive ? 'alive' : 'degraded',
      eventLoopLagMs: report.eventLoopLagMs,
      thresholdMs: report.thresholdMs,
      uptimeSeconds: report.uptimeSeconds,
    };
  }
}
