import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { INJECTION_TOKEN } from '../../constants';
import { OutboxMessageOrmEntity } from './outbox-message.orm-entity';
import { OutboxRelay } from './outbox.relay';
import { TypeormOutboxRepository } from './typeorm-outbox.repository';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([OutboxMessageOrmEntity])],
  providers: [
    { provide: INJECTION_TOKEN.OUTBOX_REPOSITORY, useClass: TypeormOutboxRepository },
    OutboxRelay,
  ],
  exports: [INJECTION_TOKEN.OUTBOX_REPOSITORY, OutboxRelay],
})
export class OutboxModule {}
