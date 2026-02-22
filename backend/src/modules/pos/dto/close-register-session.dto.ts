import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CloseRegisterSessionDto {
  @ApiPropertyOptional({
    description:
      'Kapatilacak vardiya id. Verilmezse aktif vardiya registerCode veya kullaniciya gore secilir.',
    example: 15,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  sessionId?: number;

  @ApiPropertyOptional({
    description: 'Kapatilacak vardiya icin kasa kodu.',
    example: 'KASA-1',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  registerCode?: string;

  @ApiProperty({
    description: 'Kasa kapanisinda kasadaki nakit tutar (kurus).',
    example: 64250,
  })
  @IsInt()
  @Min(0)
  closingCashCents!: number;

  @ApiPropertyOptional({
    description: 'Kapanis notu.',
    example: 'Gun sonu sayim tamamlandi',
  })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string;
}
