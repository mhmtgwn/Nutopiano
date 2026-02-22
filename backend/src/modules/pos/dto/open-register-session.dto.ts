import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class OpenRegisterSessionDto {
  @ApiPropertyOptional({
    description: 'Kasa kodu/adi (ornek: KASA-1).',
    example: 'KASA-1',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  registerCode?: string;

  @ApiProperty({
    description: 'Kasa acilisinda kasadaki nakit tutar (kurus).',
    example: 50000,
  })
  @IsInt()
  @Min(0)
  openingCashCents!: number;

  @ApiPropertyOptional({
    description: 'Acilis notu.',
    example: 'Sabah acilisi - vardiya 1',
  })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string;
}
