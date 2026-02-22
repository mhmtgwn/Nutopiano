import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class PosReturnOrderDto {
  @ApiPropertyOptional({
    description:
      'Iade tutari (kurus). Bos birakilirsa siparis toplam tutari kadar iade edilir.',
    example: 15000,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  refundAmountCents?: number;

  @ApiPropertyOptional({
    enum: PaymentMethod,
    description: 'Iade odeme yontemi.',
    example: PaymentMethod.CASH,
  })
  @IsOptional()
  @IsEnum(PaymentMethod)
  refundMethod?: PaymentMethod;

  @ApiPropertyOptional({
    description: 'Iade nedeni/notu.',
    example: 'Musteri urunu iade etti',
  })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string;
}

