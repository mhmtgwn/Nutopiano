import { IsInt, IsOptional, Min, ValidateIf } from 'class-validator';

export class SellerProductStockDto {
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsInt()
  @Min(0)
  stock?: number | null;
}

