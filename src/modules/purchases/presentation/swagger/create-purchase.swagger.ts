import { applyDecorators, HttpStatus } from '@nestjs/common';
import { ApiCreatedResponse, ApiHeader, ApiOperation } from '@nestjs/swagger';

import { HTTP_HEADER } from '../../../../shared/constants';
import {
  ApiErrorResponse,
  ApiRequestIdHeader,
  IDEMPOTENCY_KEY_MAX_LENGTH,
  IDEMPOTENCY_KEY_MIN_LENGTH,
} from '../../../../shared/presentation';
import { IDEMPOTENCY_ERROR_CODE } from '../../application';
import { PURCHASE_ERROR_CODE } from '../../domain';
import { PurchaseResponseDto } from '../dto';

/**
 * All OpenAPI metadata for `POST /purchases` lives here so the controller stays a thin
 * translation between HTTP and the use case.
 */
export const ApiCreatePurchase = (): ReturnType<typeof applyDecorators> =>
  applyDecorators(
    ApiOperation({
      summary: 'Buy a product',
      description: [
        'Transfers the product price from the buyer to the seller and marks the product as sold.',
        'The whole operation is a single database transaction and is idempotent per',
        '(buyer, Idempotency-Key): repeating a request that already succeeded returns the stored',
        'response with `Idempotent-Replay: true` instead of creating a second purchase.',
      ].join(' '),
    }),
    ApiHeader({
      name: HTTP_HEADER.IDEMPOTENCY_KEY,
      required: true,
      description: `Client-generated key, unique per buyer. Length ${IDEMPOTENCY_KEY_MIN_LENGTH}-${IDEMPOTENCY_KEY_MAX_LENGTH}`,
      schema: { type: 'string', example: '7f2b1f0e-9a3c-4f6d-8b1a-2c3d4e5f6a7b' },
    }),
    ApiRequestIdHeader(),
    ApiCreatedResponse({
      description: 'Purchase completed, or replayed from a previous identical request',
      type: PurchaseResponseDto,
      headers: {
        [HTTP_HEADER.IDEMPOTENT_REPLAY]: {
          description: 'true when the response was served from a stored idempotent result',
          schema: { type: 'string', enum: ['true', 'false'] },
        },
      },
    }),
    ApiErrorResponse({
      status: HttpStatus.BAD_REQUEST,
      description: 'Malformed payload or missing idempotency key',
      codes: ['VALIDATION_FAILED', 'IDEMPOTENCY_KEY_REQUIRED', 'IDEMPOTENCY_KEY_INVALID'],
    }),
    ApiErrorResponse({
      status: HttpStatus.NOT_FOUND,
      description: 'Product, buyer or account does not exist',
      codes: [
        PURCHASE_ERROR_CODE.PRODUCT_NOT_FOUND,
        PURCHASE_ERROR_CODE.USER_NOT_FOUND,
        PURCHASE_ERROR_CODE.ACCOUNT_NOT_FOUND,
      ],
    }),
    ApiErrorResponse({
      status: HttpStatus.CONFLICT,
      description: 'The product was bought by somebody else, or the key is still being processed',
      codes: [PURCHASE_ERROR_CODE.PRODUCT_ALREADY_SOLD, IDEMPOTENCY_ERROR_CODE.REQUEST_IN_PROGRESS],
    }),
    ApiErrorResponse({
      status: HttpStatus.UNPROCESSABLE_ENTITY,
      description: 'The request is valid but violates a business rule',
      codes: [
        PURCHASE_ERROR_CODE.INSUFFICIENT_FUNDS,
        PURCHASE_ERROR_CODE.SELF_PURCHASE_FORBIDDEN,
        PURCHASE_ERROR_CODE.UNSUPPORTED_CURRENCY,
      ],
    }),
  );
