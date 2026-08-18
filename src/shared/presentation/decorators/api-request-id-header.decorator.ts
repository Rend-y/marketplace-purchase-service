import { applyDecorators } from '@nestjs/common';
import { ApiHeader } from '@nestjs/swagger';

import { HTTP_HEADER } from '../../constants';

export const ApiRequestIdHeader = (): ReturnType<typeof applyDecorators> =>
  applyDecorators(
    ApiHeader({
      name: HTTP_HEADER.REQUEST_ID,
      required: false,
      description: 'Correlation id echoed back in logs and error responses; generated when absent',
      schema: { type: 'string', format: 'uuid' },
    }),
  );
