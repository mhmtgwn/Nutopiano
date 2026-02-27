import { IsIn, IsOptional } from 'class-validator';
import type { PosPermissionPreset } from '@common/authz';

export class PosPermissionPresetDto {
  @IsOptional()
  @IsIn(['sales', 'orders', 'reports', 'full_pos'])
  preset?: PosPermissionPreset;
}
