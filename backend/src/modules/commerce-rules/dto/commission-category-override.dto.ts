import { CommissionRuleType } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';

export class CommissionCategoryOverrideDto {
  @IsInt()
  @Min(1)
  categoryId: number;

  @IsEnum(CommissionRuleType)
  type: CommissionRuleType;

  @IsOptional()
  @IsInt()
  @Min(0)
  rateBps?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  fixedAmountCents?: number;
}
