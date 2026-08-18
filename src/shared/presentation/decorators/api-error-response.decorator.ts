import { applyDecorators, type HttpStatus } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';

import { ErrorResponseDto } from '../dto';

export interface ApiErrorResponseOptions {
  readonly status: HttpStatus;
  readonly description: string;
  readonly codes: readonly string[];
}

/** Documents an error response without spelling out the schema in every controller. */
export const ApiErrorResponse = (
  options: ApiErrorResponseOptions,
): ReturnType<typeof applyDecorators> =>
  applyDecorators(
    ApiResponse({
      status: options.status,
      description: `${options.description}. Possible codes: ${options.codes.join(', ')}`,
      type: ErrorResponseDto,
    }),
  );
