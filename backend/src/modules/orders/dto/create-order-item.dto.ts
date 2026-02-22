import { IsInt, IsOptional, Min } from 'class-validator';

export class CreateOrderItemDto {
  @IsInt()
  @Min(1)
  productId: number;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  variantId?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  expectedUnitPriceCents?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  discountAmountCents?: number;
}
