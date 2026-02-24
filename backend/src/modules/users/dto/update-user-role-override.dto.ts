import { IsString, MaxLength, MinLength } from 'class-validator';
import { UpdateUserRoleDto } from './update-user-role.dto';

export class UpdateUserRoleOverrideDto extends UpdateUserRoleDto {
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason: string;
}
