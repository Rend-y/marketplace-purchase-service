import { Money } from '../../../../../shared/domain/value-objects';
import { Account } from '../../../domain';
import type { AccountOrmEntity } from '../entities';

export const AccountMapper = {
  toDomain(row: AccountOrmEntity): Account {
    return Account.restore({
      id: row.id,
      userId: row.userId,
      balance: Money.of(row.balanceMinor, row.currency),
    });
  },
} as const;
