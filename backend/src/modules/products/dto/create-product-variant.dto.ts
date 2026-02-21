import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateProductVariantDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  size?: string;

  @IsOptional()
  @IsString()
  material?: string;

  @IsInt()
  @Min(0)
  priceCents: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  stock?: number;
}
