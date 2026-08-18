import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { serializeError } from '../../../../shared/infrastructure/logger';
import {
  HEALTH_STATUS,
  type HealthCheckResult,
  type HealthIndicatorPort,
} from '../../application/ports';

@Injectable()
export class DatabaseHealthIndicator implements HealthIndicatorPort {
  public readonly name = 'database';

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  public async check(): Promise<HealthCheckResult> {
    if (!this.dataSource.isInitialized) {
      return { name: this.name, status: HEALTH_STATUS.DOWN, detail: 'data source not initialized' };
    }

    try {
      await this.dataSource.query('SELECT 1');

      return { name: this.name, status: HEALTH_STATUS.UP };
    } catch (error: unknown) {
      return {
        name: this.name,
        status: HEALTH_STATUS.DOWN,
        detail: serializeError(error).message,
      };
    }
  }
}
