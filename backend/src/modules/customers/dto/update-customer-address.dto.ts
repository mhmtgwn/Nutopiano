import { IsOptional, IsString, Length } from 'class-validator';

export class UpdateCustomerAddressDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  fullName?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  line1?: string;

  @IsString()
  @IsOptional()
  line2?: string | null;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  district?: string;

  @IsString()
  @IsOptional()
  postalCode?: string | null;

  @IsString()
  @IsOptional()
  @Length(2, 2)
  country?: string;
}
