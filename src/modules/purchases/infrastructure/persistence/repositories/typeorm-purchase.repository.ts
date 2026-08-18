import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { ClsService } from 'nestjs-cls';
import { DataSource } from 'typeorm';

import { DB_CONSTRAINT } from '../../../../../database/constraints.constant';
import {
  isCheckViolation,
  isUniqueViolation,
  TypeormRepository,
} from '../../../../../shared/infrastructure/database';
import {
  ProductAlreadySoldError,
  SelfPurchaseForbiddenError,
  type Purchase,
  type PurchaseRepositoryPort,
} from '../../../domain';
import { PurchaseOrmEntity } from '../entities';
import { PurchaseMapper } from '../mappers';

@Injectable()
export class TypeormPurchaseRepository extends TypeormRepository implements PurchaseRepositoryPort {
  constructor(@InjectDataSource() dataSource: DataSource, cls: ClsService) {
    super(dataSource, cls);
  }

  public async save(purchase: Purchase): Promise<void> {
    try {
      await this.manager
        .getRepository(PurchaseOrmEntity)
        .insert(PurchaseMapper.toPersistence(purchase));
    } catch (error: unknown) {
      // Last line of defence behind the row lock: the database itself refuses a second purchase
      // of the same product, and the driver error is translated into a domain error here.
      if (isUniqueViolation(error, DB_CONSTRAINT.PURCHASES_PRODUCT_UNIQUE)) {
        throw new ProductAlreadySoldError(purchase.productId);
      }

      if (isCheckViolation(error, DB_CONSTRAINT.PURCHASES_BUYER_NOT_SELLER)) {
        throw new SelfPurchaseForbiddenError(purchase.buyerId, purchase.productId);
      }

      throw error;
    }
  }
}
