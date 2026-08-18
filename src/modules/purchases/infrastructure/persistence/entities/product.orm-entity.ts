import { Column, Entity, PrimaryColumn } from 'typeorm';

import { bigintTransformer } from '../../../../../shared/infrastructure/database';
import { PRODUCT_STATUS, type ProductStatus } from '../../../domain';

@Entity({ name: 'products' })
export class ProductOrmEntity {
  @PrimaryColumn({ name: 'id', type: 'uuid' })
  public id: string;

  @Column({ name: 'seller_id', type: 'uuid' })
  public sellerId: string;

  @Column({ name: 'title', type: 'varchar', length: 255 })
  public title: string;

  @Column({ name: 'price_minor', type: 'bigint', transformer: bigintTransformer })
  public priceMinor: number;

  @Column({ name: 'currency', type: 'char', length: 3 })
  public currency: string;

  @Column({ name: 'status', type: 'enum', enum: PRODUCT_STATUS, enumName: 'product_status' })
  public status: ProductStatus;

  @Column({ name: 'sold_at', type: 'timestamptz', nullable: true })
  public soldAt: Date | null;

  @Column({ name: 'created_at', type: 'timestamptz' })
  public createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamptz' })
  public updatedAt: Date;
}
