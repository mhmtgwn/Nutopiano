import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ProductType } from '@prisma/client';

export class UpdatePosProductDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsInt()
    @Min(1)
    @Type(() => Number)
    categoryId?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    name?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    sku?: string;

    @ApiPropertyOptional({ enum: ProductType })
    @IsOptional()
    @IsEnum(ProductType)
    type?: ProductType;

    @ApiPropertyOptional()
    @IsOptional()
    @IsInt()
    @Min(0)
    @Type(() => Number)
    priceCents?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsInt()
    @Min(0)
    @Type(() => Number)
    costPriceCents?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    description?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    imageUrl?: string;

    @ApiPropertyOptional({ description: 'Publish product to marketplace' })
    @IsOptional()
    isPublished?: boolean;

    @ApiPropertyOptional({ description: 'Activate/deactivate product' })
    @IsOptional()
    isActive?: boolean;
}
