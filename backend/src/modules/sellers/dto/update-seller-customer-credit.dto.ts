import { CreditBlockPolicy } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';

export class UpdateSellerCustomerCreditDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  creditLimitCents?: number | null;

  @IsOptional()
  @IsEnum(CreditBlockPolicy)
  creditBlockPolicy?: CreditBlockPolicy;

  @IsOptional()
  @IsInt()
  @Min(1)
  sellerId?: number;
}
