import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { OrderSource } from '@prisma/client';
import { CreateOrderItemDto } from './create-order-item.dto';

export enum OrderPaymentMode {
  CASH = 'CASH',
  CARD = 'CARD',
  CREDIT = 'CREDIT',
  SPLIT = 'SPLIT',
}

export class CreateOrderDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  customerId?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  sellerId?: number;

  @IsOptional()
  @IsEnum(OrderSource)
  source?: OrderSource;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Matches(/^[^<>]*$/, { message: 'HTML tag kullanılamaz' })
  notes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  couponCode?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  cartDiscountAmountCents?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  shippingCostCents?: number;

  @IsOptional()
  @IsEnum(OrderPaymentMode)
  paymentMode?: OrderPaymentMode;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];
}

