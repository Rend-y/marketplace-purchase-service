import { type ClsService } from 'nestjs-cls';
import type { DataSource, EntityManager } from 'typeorm';

import { TRANSACTION_CLS_KEY } from './transactional-context';

/**
 * Base for TypeORM-backed repositories.
 *
 * Resolves the `EntityManager` from the active transaction if there is one, and falls back to
 * the pooled manager (auto-commit) otherwise. Repositories therefore never expose a transaction
 * parameter to the application layer.
 */
export abstract class TypeormRepository {
  protected constructor(
    private readonly dataSource: DataSource,
    private readonly cls: ClsService,
  ) {}

  protected get manager(): EntityManager {
    if (!this.cls.isActive()) {
      return this.dataSource.manager;
    }

    const transactional: unknown = this.cls.get(TRANSACTION_CLS_KEY);

    return (transactional as EntityManager | undefined) ?? this.dataSource.manager;
  }
}
