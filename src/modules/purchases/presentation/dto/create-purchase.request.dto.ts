import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class CreatePurchaseRequestDto {
  @ApiProperty({
    format: 'uuid',
    description: 'Identifier of the product being bought',
    example: '6b0a2a2e-9b5b-4a1e-8f2c-2b4f5a7c1d3e',
  })
  @IsUUID('4')
  public readonly productId: string;

  @ApiProperty({
    format: 'uuid',
    description:
      'Identifier of the buyer. Supplied by the caller because authentication is out of scope for this service',
    example: 'f1c2d3e4-5a6b-4c7d-8e9f-0a1b2c3d4e5f',
  })
  @IsUUID('4')
  public readonly buyerId: string;
}
