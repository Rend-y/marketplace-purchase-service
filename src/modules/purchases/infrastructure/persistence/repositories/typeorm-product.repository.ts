import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { ClsService } from 'nestjs-cls';
import { DataSource } from 'typeorm';

import { TypeormRepository } from '../../../../../shared/infrastructure/database';
import type { Product, ProductRepositoryPort } from '../../../domain';
import { ProductOrmEntity } from '../entities';
import { ProductMapper } from '../mappers';

@Injectable()
export class TypeormProductRepository extends TypeormRepository implements ProductRepositoryPort {
  constructor(@InjectDataSource() dataSource: DataSource, cls: ClsService) {
    super(dataSource, cls);
  }

  public async findByIdForUpdate(productId: string): Promise<Product | null> {
    const row = await this.manager
      .getRepository(ProductOrmEntity)
      .createQueryBuilder('product')
      .setLock('pessimistic_write')
      .where('product.id = :productId', { productId })
      .getOne();

    return row === null ? null : ProductMapper.toDomain(row);
  }

  public async save(product: Product): Promise<void> {
    await this.manager.getRepository(ProductOrmEntity).update(
      { id: product.id },
      {
        status: product.status,
        soldAt: product.soldAt,
        updatedAt: new Date(),
      },
    );
  }
}
