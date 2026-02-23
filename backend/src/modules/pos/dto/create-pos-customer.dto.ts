import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreatePosCustomerDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsOptional()
  @IsString()
  balance?: string;
}

