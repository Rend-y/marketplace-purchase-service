import { Global, Module } from '@nestjs/common';

import { INJECTION_TOKEN } from '../../constants';
import { RabbitmqPublisher } from './rabbitmq.publisher';

@Global()
@Module({
  providers: [
    RabbitmqPublisher,
    { provide: INJECTION_TOKEN.MESSAGE_PUBLISHER, useExisting: RabbitmqPublisher },
  ],
  exports: [RabbitmqPublisher, INJECTION_TOKEN.MESSAGE_PUBLISHER],
})
export class MessagingModule {}
