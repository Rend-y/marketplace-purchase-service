import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ErrorResponseDto {
  @ApiProperty({ example: 409, description: 'HTTP status code' })
  public readonly statusCode: number;

  @ApiProperty({
    example: 'PRODUCT_ALREADY_SOLD',
    description: 'Stable machine-readable error code',
  })
  public readonly code: string;

  @ApiProperty({ example: 'Product is already sold' })
  public readonly message: string;

  @ApiPropertyOptional({
    description: 'Additional machine-readable context',
    type: 'object',
    additionalProperties: true,
  })
  public readonly details?: Record<string, unknown>;

  @ApiProperty({ example: '3f1c1b6a-1f0e-4c4a-9a4c-4f1b0f9f2f77' })
  public readonly requestId: string;

  @ApiProperty({ example: '2026-08-18T10:15:30.123Z', format: 'date-time' })
  public readonly timestamp: string;

  @ApiProperty({ example: '/purchases' })
  public readonly path: string;
}
