import { Column, Entity, PrimaryColumn } from 'typeorm';

import { bigintTransformer } from '../../../../../shared/infrastructure/database';
import { LEDGER_DIRECTION, type LedgerDirection } from '../../../domain';

@Entity({ name: 'ledger_entries' })
export class LedgerEntryOrmEntity {
  @PrimaryColumn({ name: 'id', type: 'uuid' })
  public id: string;

  @Column({ name: 'purchase_id', type: 'uuid' })
  public purchaseId: string;

  @Column({ name: 'account_id', type: 'uuid' })
  public accountId: string;

  @Column({
    name: 'direction',
    type: 'enum',
    enum: LEDGER_DIRECTION,
    enumName: 'ledger_direction',
  })
  public direction: LedgerDirection;

  @Column({ name: 'amount_minor', type: 'bigint', transformer: bigintTransformer })
  public amountMinor: number;

  @Column({ name: 'currency', type: 'char', length: 3 })
  public currency: string;

  @Column({ name: 'created_at', type: 'timestamptz' })
  public createdAt: Date;
}
