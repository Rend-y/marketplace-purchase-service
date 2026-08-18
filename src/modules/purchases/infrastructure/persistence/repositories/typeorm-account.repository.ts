import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { ClsService } from 'nestjs-cls';
import { DataSource } from 'typeorm';

import { TypeormRepository } from '../../../../../shared/infrastructure/database';
import type { Account, AccountRepositoryPort } from '../../../domain';
import { AccountOrmEntity } from '../entities';
import { AccountMapper } from '../mappers';

@Injectable()
export class TypeormAccountRepository extends TypeormRepository implements AccountRepositoryPort {
  constructor(@InjectDataSource() dataSource: DataSource, cls: ClsService) {
    super(dataSource, cls);
  }

  /**
   * `ORDER BY account.id` is not cosmetic: locking both accounts in a globally consistent order
   * is what prevents a deadlock when two users buy from each other at the same moment.
   */
  public async lockByUserIds(userIds: readonly string[], currency: string): Promise<Account[]> {
    const uniqueUserIds = [...new Set(userIds)];

    if (uniqueUserIds.length === 0) {
      return [];
    }

    const rows = await this.manager
      .getRepository(AccountOrmEntity)
      .createQueryBuilder('account')
      .setLock('pessimistic_write')
      .where('account.userId IN (:...userIds)', { userIds: uniqueUserIds })
      .andWhere('account.currency = :currency', { currency })
      .orderBy('account.id', 'ASC')
      .getMany();

    return rows.map((row) => AccountMapper.toDomain(row));
  }

  public async saveMany(accounts: readonly Account[]): Promise<void> {
    const uniqueAccounts = [...new Map(accounts.map((account) => [account.id, account])).values()];
    const repository = this.manager.getRepository(AccountOrmEntity);
    const updatedAt = new Date();

    for (const account of uniqueAccounts) {
      await repository.update(
        { id: account.id },
        { balanceMinor: account.balance.minorUnits, updatedAt },
      );
    }
  }
}
