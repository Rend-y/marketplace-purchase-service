import { Body, Controller, HttpCode, HttpStatus, Post, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';

import { CreatePurchaseUseCase } from '../application';
import { HTTP_HEADER } from '../../../shared/constants';
import { IdempotencyKey } from '../../../shared/presentation';
import { CreatePurchaseRequestDto, PurchaseResponseDto } from './dto';
import { PurchaseResponseMapper } from './mappers';
import { ApiCreatePurchase } from './swagger';

@ApiTags('purchases')
@Controller('purchases')
export class PurchasesController {
  constructor(private readonly createPurchase: CreatePurchaseUseCase) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatePurchase()
  public async create(
    @Body() body: CreatePurchaseRequestDto,
    @IdempotencyKey() idempotencyKey: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<PurchaseResponseDto> {
    const result = await this.createPurchase.execute({
      productId: body.productId,
      buyerId: body.buyerId,
      idempotencyKey,
    });

    response.setHeader(HTTP_HEADER.IDEMPOTENT_REPLAY, String(result.replayed));

    return PurchaseResponseMapper.toDto(result.purchase);
  }
}
