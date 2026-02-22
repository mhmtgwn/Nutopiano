import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaymentMethod } from '@prisma/client';

export class SplitPaymentLineDto {
  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @IsInt()
  @Min(1)
  amountCents: number;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  reference?: string;
}

export class ApplySplitPaymentsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SplitPaymentLineDto)
  payments: SplitPaymentLineDto[];
}
