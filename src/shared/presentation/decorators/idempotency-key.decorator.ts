import { BadRequestException, createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

import { HTTP_HEADER } from '../../constants';

export const IDEMPOTENCY_KEY_MAX_LENGTH = 255;
export const IDEMPOTENCY_KEY_MIN_LENGTH = 8;

const IDEMPOTENCY_KEY_ERROR_CODE = {
  REQUIRED: 'IDEMPOTENCY_KEY_REQUIRED',
  INVALID: 'IDEMPOTENCY_KEY_INVALID',
} as const;

/**
 * Reads and validates the `Idempotency-Key` header.
 *
 * Kept as a parameter decorator rather than a DTO field: idempotency is a transport concern of
 * the request, not part of the purchase payload.
 */
export const IdempotencyKey = createParamDecorator(
  (_data: unknown, context: ExecutionContext): string => {
    const request = context.switchToHttp().getRequest<Request>();
    const raw = request.headers[HTTP_HEADER.IDEMPOTENCY_KEY];
    const value = typeof raw === 'string' ? raw.trim() : '';

    if (value.length === 0) {
      throw new BadRequestException({
        code: IDEMPOTENCY_KEY_ERROR_CODE.REQUIRED,
        message: `Header "${HTTP_HEADER.IDEMPOTENCY_KEY}" is required`,
      });
    }

    if (value.length < IDEMPOTENCY_KEY_MIN_LENGTH || value.length > IDEMPOTENCY_KEY_MAX_LENGTH) {
      throw new BadRequestException({
        code: IDEMPOTENCY_KEY_ERROR_CODE.INVALID,
        message: `Header "${HTTP_HEADER.IDEMPOTENCY_KEY}" must be between ${IDEMPOTENCY_KEY_MIN_LENGTH} and ${IDEMPOTENCY_KEY_MAX_LENGTH} characters`,
      });
    }

    return value;
  },
);
