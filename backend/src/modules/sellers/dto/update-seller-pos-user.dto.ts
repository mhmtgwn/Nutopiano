import { IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';
import { IsIn } from 'class-validator';
import type { PosPermissionPreset } from '@common/authz';

export class UpdateSellerPosUserDto {
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
