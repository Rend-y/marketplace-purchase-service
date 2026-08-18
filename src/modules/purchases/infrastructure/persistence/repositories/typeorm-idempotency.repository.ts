import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { ClsService } from 'nestjs-cls';
import { DataSource } from 'typeorm';

import { DB_CONSTRAINT } from '../../../../../database/constraints.constant';
import {
  POSTGRES_ERROR_CODE,
  toPostgresError,
  TypeormRepository,
} from '../../../../../shared/infrastructure/database';
import type { JsonObject } from '../../../../../shared/types';
import type {
  IdempotencyClaimParams,
  IdempotencyRecord,
  IdempotencyRepositoryPort,
} from '../../../application/ports';
import { UserNotFoundError } from '../../../domain';
import { IdempotencyKeyOrmEntity } from '../entities';

@Injectable()
export class TypeormIdempotencyRepository
  extends TypeormRepository
  implements IdempotencyRepositoryPort
{
  constructor(@InjectDataSource() dataSource: DataSource, cls: ClsService) {
    super(dataSource, cls);
  }

  /**
   * `INSERT ... ON CONFLICT DO NOTHING RETURNING id`.
   *
   * When a concurrent request already inserted the same key but has not committed yet, Postgres
   * blocks this statement on the unique index until that transaction finishes. The winner commits
   * and this call returns `false` (the caller replays the stored result); if the winner rolled
   * back, the insert succeeds here and the operation is retried for real.
   */
  public async claim(params: IdempotencyClaimParams): Promise<boolean> {
    try {
      const result = await this.manager
        .createQueryBuilder()
        .insert()
        .into(IdempotencyKeyOrmEntity)
        .values({
          id: params.id,
          userId: params.userId,
          idempotencyKey: params.idempotencyKey,
          resourceId: null,
          result: null,
          createdAt: params.createdAt,
          completedAt: null,
        })
        .orIgnore()
        .returning('id')
        .execute();

      const inserted: unknown = result.raw;

      return Array.isArray(inserted) && inserted.length > 0;
    } catch (error: unknown) {
      const postgresError = toPostgresError(error);

      if (
        postgresError?.code === POSTGRES_ERROR_CODE.FOREIGN_KEY_VIOLATION &&
        postgresError.constraint === DB_CONSTRAINT.IDEMPOTENCY_USER_FK
      ) {
        throw new UserNotFoundError(params.userId);
      }

      throw error;
    }
  }

  public async findByUserAndKey(
    userId: string,
    idempotencyKey: string,
  ): Promise<IdempotencyRecord | null> {
    const row = await this.manager
      .getRepository(IdempotencyKeyOrmEntity)
      .findOne({ where: { userId, idempotencyKey } });

    if (row === null) {
      return null;
    }

    return { id: row.id, resourceId: row.resourceId, result: row.result as JsonObject | null };
  }

  public async complete(claimId: string, resourceId: string, result: JsonObject): Promise<void> {
    await this.manager
      .getRepository(IdempotencyKeyOrmEntity)
      .update({ id: claimId }, { resourceId, result, completedAt: new Date() });
  }
}
