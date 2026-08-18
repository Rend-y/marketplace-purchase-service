import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { ClsService } from 'nestjs-cls';
import { DataSource } from 'typeorm';

import { TypeormRepository } from '../../../../../shared/infrastructure/database';
import type { LedgerEntry, LedgerRepositoryPort } from '../../../domain';
import { LedgerEntryOrmEntity } from '../entities';
import { LedgerEntryMapper } from '../mappers';

@Injectable()
export class TypeormLedgerRepository extends TypeormRepository implements LedgerRepositoryPort {
  constructor(@InjectDataSource() dataSource: DataSource, cls: ClsService) {
    super(dataSource, cls);
  }

  public async saveEntries(entries: readonly LedgerEntry[]): Promise<void> {
    if (entries.length === 0) {
      return;
    }

    await this.manager
      .getRepository(LedgerEntryOrmEntity)
      .insert(entries.map((entry) => LedgerEntryMapper.toPersistence(entry)));
  }
}
