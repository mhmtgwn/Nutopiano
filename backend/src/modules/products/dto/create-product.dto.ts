import {
  IsBoolean,
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ProductType } from '@prisma/client';

export class CreateProductDto {
  @IsInt()
  @IsNotEmpty()
  @Min(1)
  categoryId: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  ownerSellerId?: number;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  subtitle?: string;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsEnum(ProductType)
  type: ProductType;

  // Price in smallest currency unit (e.g. cents) represented as string to avoid float issues
  @IsString()
  @IsNotEmpty()
  price: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  costPriceCents?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[];

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @IsOptional()
  @IsInt()
  @Min(0)
  stock?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  seoTitle?: string;

  @IsOptional()
  @IsString()
  seoDescription?: string;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}
