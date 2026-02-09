import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateOrderStatusDto {
  @IsOptional()
  @IsString()
  key?: string;

  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  orderIndex?: number;

  @IsOptional()
  @IsBoolean()
  isFinal?: boolean;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
