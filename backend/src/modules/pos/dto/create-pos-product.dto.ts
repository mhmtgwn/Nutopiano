import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ProductType } from '@prisma/client';

export class CreatePosProductDto {
    @ApiProperty({ description: 'Category ID', example: 1 })
    @IsInt()
    @Min(1)
    @Type(() => Number)
    categoryId: number;

    @ApiProperty({ description: 'Product name', example: 'Piyano Ders Kitabı' })
    @IsString()
    name: string;

    @ApiPropertyOptional({ description: 'SKU / barcode', example: 'SKU-001' })
    @IsOptional()
    @IsString()
    sku?: string;

    @ApiProperty({ enum: ProductType, default: ProductType.PHYSICAL })
    @IsEnum(ProductType)
    type: ProductType = ProductType.PHYSICAL;

    @ApiProperty({ description: 'Price in cents (kuruş)', example: 15000 })
    @IsInt()
    @Min(0)
    @Type(() => Number)
    priceCents: number;

    @ApiPropertyOptional({ description: 'Cost price in cents', example: 8000 })
    @IsOptional()
    @IsInt()
    @Min(0)
    @Type(() => Number)
    costPriceCents?: number;

    @ApiPropertyOptional({ description: 'Initial stock quantity', example: 50 })
    @IsOptional()
    @IsInt()
    @Min(0)
    @Type(() => Number)
    stock?: number;

    @ApiPropertyOptional({ description: 'Short description' })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiPropertyOptional({ description: 'Image URL' })
    @IsOptional()
    @IsString()
    imageUrl?: string;
}
