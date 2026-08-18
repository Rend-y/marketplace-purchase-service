import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { ClsService } from 'nestjs-cls';
import { DataSource } from 'typeorm';

import type { JsonObject } from '../../types';
import type {
  OutboxMessageRecord,
  OutboxMessageToEnqueue,
  OutboxRepositoryPort,
} from '../../application/ports';
import { TypeormRepository } from '../database';
import { OutboxMessageOrmEntity } from './outbox-message.orm-entity';

const MAX_STORED_ERROR_LENGTH = 1_000;

@Injectable()
export class TypeormOutboxRepository extends TypeormRepository implements OutboxRepositoryPort {
  constructor(@InjectDataSource() dataSource: DataSource, cls: ClsService) {
    super(dataSource, cls);
  }

  public async enqueue(message: OutboxMessageToEnqueue): Promise<void> {
    await this.manager.getRepository(OutboxMessageOrmEntity).insert({
      id: message.id,
      aggregateType: message.aggregateType,
      aggregateId: message.aggregateId,
      eventType: message.eventType,
      payload: message.payload as Record<string, unknown>,
      occurredAt: message.occurredAt,
      publishedAt: null,
      attempts: 0,
      lastError: null,
    });
  }

  /** `FOR UPDATE SKIP LOCKED` lets several instances drain the outbox in parallel. */
  public async lockBatchForPublishing(
    limit: number,
    maxAttempts: number,
  ): Promise<OutboxMessageRecord[]> {
    const rows = await this.manager
      .getRepository(OutboxMessageOrmEntity)
      .createQueryBuilder('outbox')
      .setLock('pessimistic_write')
      .setOnLocked('skip_locked')
      .where('outbox.publishedAt IS NULL')
      .andWhere('outbox.attempts < :maxAttempts', { maxAttempts })
      .orderBy('outbox.occurredAt', 'ASC')
      .limit(limit)
      .getMany();

    return rows.map((row) => ({
      id: row.id,
      aggregateType: row.aggregateType,
      aggregateId: row.aggregateId,
      eventType: row.eventType,
      payload: row.payload as JsonObject,
      occurredAt: row.occurredAt,
      attempts: row.attempts,
    }));
  }

  public async markPublished(messageId: string, publishedAt: Date): Promise<void> {
    await this.manager
      .getRepository(OutboxMessageOrmEntity)
      .update({ id: messageId }, { publishedAt, lastError: null });
  }

  public async markFailed(messageId: string, error: string): Promise<void> {
    await this.manager
      .getRepository(OutboxMessageOrmEntity)
      .createQueryBuilder()
      .update(OutboxMessageOrmEntity)
      .set({
        attempts: () => 'attempts + 1',
        lastError: error.slice(0, MAX_STORED_ERROR_LENGTH),
      })
      .where('id = :messageId', { messageId })
      .execute();
  }

  public async countPending(maxAttempts: number): Promise<number> {
    return this.manager
      .getRepository(OutboxMessageOrmEntity)
      .createQueryBuilder('outbox')
      .where('outbox.publishedAt IS NULL')
      .andWhere('outbox.attempts < :maxAttempts', { maxAttempts })
      .getCount();
  }
}
