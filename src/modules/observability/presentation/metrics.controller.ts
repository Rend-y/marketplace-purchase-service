import { Controller, Get, Header, Res } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Response } from 'express';

import { MetricsService } from '../../../shared/infrastructure/metrics';

/**
 * Prometheus scrape endpoint. Excluded from the public OpenAPI document: it is an operational
 * surface, not part of the service contract.
 */
@ApiExcludeController()
@Controller()
export class MetricsController {
  constructor(private readonly metrics: MetricsService) {}

  @Get('metrics')
  @Header('Cache-Control', 'no-store')
  public async scrape(@Res({ passthrough: true }) response: Response): Promise<string> {
    response.setHeader('Content-Type', this.metrics.contentType);

    return this.metrics.render();
  }
}
