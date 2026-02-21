import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateCustomerPreferencesDto {
  @IsOptional()
  @IsBoolean()
  allowSms?: boolean;

  @IsOptional()
  @IsBoolean()
  allowEmail?: boolean;

  @IsOptional()
  @IsBoolean()
  allowMarketing?: boolean;

  @IsOptional()
  @IsBoolean()
  kvkkConsent?: boolean;
}
