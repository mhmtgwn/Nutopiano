import { IsOptional, IsString, MaxLength, Matches } from 'class-validator';

export class UpdateOrderDto {
  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  statusKey?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  shipmentCarrier?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  @Matches(/^[A-Za-z0-9\-_.\/]+$/, {
    message: 'Geçersiz takip numarası formatı',
  })
  shipmentTrackingNumber?: string;
}
