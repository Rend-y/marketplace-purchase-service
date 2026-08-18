import { Global, Module } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { databaseConfig } from '../config';
import { INJECTION_TOKEN } from '../shared/constants';
import { TypeormTransactionManager } from '../shared/infrastructure/database';
import { buildDataSourceOptions } from './data-source';

@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [databaseConfig.KEY],
      useFactory: (config: ConfigType<typeof databaseConfig>) => ({
        ...buildDataSourceOptions(config),
        autoLoadEntities: false,
      }),
    }),
  ],
  providers: [
    { provide: INJECTION_TOKEN.TRANSACTION_MANAGER, useClass: TypeormTransactionManager },
  ],
  exports: [INJECTION_TOKEN.TRANSACTION_MANAGER],
})
export class DatabaseModule {}
