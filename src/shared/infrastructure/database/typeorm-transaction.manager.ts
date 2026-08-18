import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { ClsService } from 'nestjs-cls';
import { DataSource } from 'typeorm';

import type { TransactionManagerPort } from '../../application/ports';
import { TRANSACTION_CLS_KEY } from './transactional-context';

const ISOLATION_LEVEL = 'READ COMMITTED';

@Injectable()
export class TypeormTransactionManager implements TransactionManagerPort {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly cls: ClsService,
  ) {}

  /**
   * Opens a `READ COMMITTED` transaction and publishes its `EntityManager` into the async
   * context, so every repository resolved downstream joins the same transaction.
   *
   * Nested calls join the outer transaction instead of opening a second one: a purchase must
   * commit or roll back as a single unit.
   */
  public async runInTransaction<TResult>(work: () => Promise<TResult>): Promise<TResult> {
    if (this.cls.isActive() && this.cls.get(TRANSACTION_CLS_KEY) !== undefined) {
      return work();
    }

    const runTransaction = async (): Promise<TResult> =>
      this.dataSource.transaction(ISOLATION_LEVEL, async (manager) => {
        this.cls.set(TRANSACTION_CLS_KEY, manager);

        try {
          return await work();
        } finally {
          this.cls.set(TRANSACTION_CLS_KEY, undefined);
        }
      });

    // Background workers (outbox relay) run outside any HTTP request, so a context is created here.
    return this.cls.isActive() ? runTransaction() : this.cls.run(runTransaction);
  }
}
