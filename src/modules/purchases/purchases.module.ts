import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { INJECTION_TOKEN } from '../../shared/constants';
import { CreatePurchaseUseCase } from './application';
import { PurchaseSettlementService } from './domain';
import { PurchaseMetricsAdapter } from './infrastructure/metrics/purchase-metrics.adapter';
import {
  AccountOrmEntity,
  IdempotencyKeyOrmEntity,
  LedgerEntryOrmEntity,
  ProductOrmEntity,
  PurchaseOrmEntity,
  UserOrmEntity,
} from './infrastructure/persistence/entities';
import {
  TypeormAccountRepository,
  TypeormIdempotencyRepository,
  TypeormLedgerRepository,
  TypeormProductRepository,
  TypeormPurchaseRepository,
} from './infrastructure/persistence/repositories';
import { PurchasesController } from './presentation';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserOrmEntity,
      AccountOrmEntity,
      ProductOrmEntity,
      PurchaseOrmEntity,
      LedgerEntryOrmEntity,
      IdempotencyKeyOrmEntity,
    ]),
  ],
  controllers: [PurchasesController],
  providers: [
    CreatePurchaseUseCase,
    PurchaseSettlementService,
    { provide: INJECTION_TOKEN.PRODUCT_REPOSITORY, useClass: TypeormProductRepository },
    { provide: INJECTION_TOKEN.ACCOUNT_REPOSITORY, useClass: TypeormAccountRepository },
    { provide: INJECTION_TOKEN.PURCHASE_REPOSITORY, useClass: TypeormPurchaseRepository },
    { provide: INJECTION_TOKEN.LEDGER_REPOSITORY, useClass: TypeormLedgerRepository },
    { provide: INJECTION_TOKEN.IDEMPOTENCY_REPOSITORY, useClass: TypeormIdempotencyRepository },
    { provide: INJECTION_TOKEN.PURCHASE_METRICS, useClass: PurchaseMetricsAdapter },
  ],
})
export class PurchasesModule {}
