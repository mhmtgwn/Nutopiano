import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateSellerTeamInviteDto {
  @IsInt()
  @Min(1)
  targetUserId: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(720)
  expiresInHours?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];
}

