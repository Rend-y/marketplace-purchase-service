import { Column, Entity, PrimaryColumn } from 'typeorm';

import { bigintTransformer } from '../../../../../shared/infrastructure/database';

@Entity({ name: 'purchases' })
export class PurchaseOrmEntity {
  @PrimaryColumn({ name: 'id', type: 'uuid' })
  public id: string;

  @Column({ name: 'product_id', type: 'uuid' })
  public productId: string;

  @Column({ name: 'buyer_id', type: 'uuid' })
  public buyerId: string;

  @Column({ name: 'seller_id', type: 'uuid' })
  public sellerId: string;

  @Column({ name: 'amount_minor', type: 'bigint', transformer: bigintTransformer })
  public amountMinor: number;

  @Column({ name: 'currency', type: 'char', length: 3 })
  public currency: string;

  @Column({ name: 'purchased_at', type: 'timestamptz' })
  public purchasedAt: Date;
}
