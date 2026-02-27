import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { IsIn } from 'class-validator';
import type { PosPermissionPreset } from '@common/authz';

export class CreateSellerPosUserDto {
  @IsInt()
  @Min(1)
  userId: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsIn(['sales', 'orders', 'reports', 'full_pos'])
  preset?: PosPermissionPreset;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];
}
