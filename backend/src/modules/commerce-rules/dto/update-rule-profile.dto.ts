import { RoundingMode } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { CommissionRuleConfigDto } from './commission-rule-config.dto';

export class UpdateRuleProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  currency?: string;

  @IsOptional()
  @IsBoolean()
  taxInclusive?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  taxProfileCode?: string;

  @IsOptional()
  @IsEnum(RoundingMode)
  roundingMode?: RoundingMode;

  @IsOptional()
  @IsObject()
  discountRulesJson?: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => CommissionRuleConfigDto)
  commissionRule?: CommissionRuleConfigDto;
}
