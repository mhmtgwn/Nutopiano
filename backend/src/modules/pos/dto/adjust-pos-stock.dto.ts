import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export enum StockAdjustmentMode {
    SET = 'SET',       // Stoku doğrudan belirli değere ayarla
    ADD = 'ADD',       // Stoka ekle (giriş)
    SUBTRACT = 'SUBTRACT', // Stoktan çıkar (kayıp/zarar)
}

export class AdjustPosStockDto {
    @ApiProperty({ enum: StockAdjustmentMode, description: 'Adjustment mode: SET | ADD | SUBTRACT' })
    @IsEnum(StockAdjustmentMode)
    mode: StockAdjustmentMode;

    @ApiProperty({ description: 'Amount (always positive)', example: 10 })
    @IsInt()
    @Type(() => Number)
    amount: number;

    @ApiPropertyOptional({ description: 'Optional reason/note for the adjustment' })
    @IsOptional()
    @IsString()
    reason?: string;

    @ApiPropertyOptional({ description: 'Variant ID (if adjusting a variant stock)' })
    @IsOptional()
    @IsInt()
    @Type(() => Number)
    variantId?: number;
}
