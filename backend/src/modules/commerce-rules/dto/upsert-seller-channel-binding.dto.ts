import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator';

export class UpsertSellerChannelBindingDto {
  @IsInt()
  @Min(1)
  calculationProfileId: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
