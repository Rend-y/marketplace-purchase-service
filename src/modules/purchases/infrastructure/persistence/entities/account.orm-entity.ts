import { Column, Entity, PrimaryColumn } from 'typeorm';

import { bigintTransformer } from '../../../../../shared/infrastructure/database';

@Entity({ name: 'accounts' })
export class AccountOrmEntity {
  @PrimaryColumn({ name: 'id', type: 'uuid' })
  public id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  public userId: string;

  @Column({ name: 'currency', type: 'char', length: 3 })
  public currency: string;

  @Column({ name: 'balance_minor', type: 'bigint', transformer: bigintTransformer })
  public balanceMinor: number;

  @Column({ name: 'created_at', type: 'timestamptz' })
  public createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamptz' })
  public updatedAt: Date;
}
