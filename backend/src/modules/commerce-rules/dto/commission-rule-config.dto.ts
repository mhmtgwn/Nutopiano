import { CommissionRuleType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  Min,
  ValidateNested,
} from 'class-validator';
import { CommissionCategoryOverrideDto } from './commission-category-override.dto';

export class CommissionRuleConfigDto {
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

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CommissionCategoryOverrideDto)
  overrides?: CommissionCategoryOverrideDto[];
}
