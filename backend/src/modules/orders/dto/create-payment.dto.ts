import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import { PaymentMethod } from '@prisma/client';

export class CreatePaymentDto {
  // Amount in smallest currency unit (e.g. cents) represented as string to avoid float issues
  @IsString()
  @IsNotEmpty()
  @Matches(/^[1-9]\d*$/, { message: 'Tutar pozitif olmalı' })
  amount: string;

  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @IsOptional()
  @IsString()
  reference?: string;
}
