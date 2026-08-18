import { ApiProperty } from '@nestjs/swagger';

export class PurchaseResponseDto {
  @ApiProperty({ format: 'uuid' })
  public readonly id: string;

  @ApiProperty({ format: 'uuid' })
  public readonly productId: string;

  @ApiProperty({ format: 'uuid' })
  public readonly buyerId: string;

  @ApiProperty({ format: 'uuid' })
  public readonly sellerId: string;

  @ApiProperty({
    example: 150000,
    description: 'Amount in minor units of the currency (kopecks, cents)',
  })
  public readonly amountMinorUnits: number;

  @ApiProperty({ example: 'RUB', description: 'ISO-4217 alpha-3 code' })
  public readonly currency: string;

  @ApiProperty({ format: 'date-time', example: '2026-08-18T10:15:30.123Z' })
  public readonly purchasedAt: string;
}
