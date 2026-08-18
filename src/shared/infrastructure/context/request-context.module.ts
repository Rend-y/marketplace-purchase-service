import { Module } from '@nestjs/common';
import type { Request } from 'express';
import { ClsModule } from 'nestjs-cls';
import { v4 as uuidv4 } from 'uuid';

import { HTTP_HEADER } from '../../constants';

const firstNonEmpty = (header: string | string[] | undefined): string | undefined => {
  if (typeof header === 'string' && header.trim().length > 0) {
    return header.trim();
  }

  if (Array.isArray(header)) {
    return header.find((value) => value.trim().length > 0)?.trim();
  }

  return undefined;
};

/**
 * Async-local context shared by logging, error responses and the transaction manager.
 * The correlation id is taken from `x-request-id` when the caller supplies one, otherwise
 * a UUID v4 is generated.
 */
@Module({
  imports: [
    ClsModule.forRoot({
      global: true,
      middleware: {
        mount: true,
        generateId: true,
        idGenerator: (request: Request): string =>
          firstNonEmpty(request.headers[HTTP_HEADER.REQUEST_ID]) ?? uuidv4(),
      },
    }),
  ],
})
export class RequestContextModule {}
