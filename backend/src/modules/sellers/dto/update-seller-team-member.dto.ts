import { IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateSellerTeamMemberDto {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];
}

