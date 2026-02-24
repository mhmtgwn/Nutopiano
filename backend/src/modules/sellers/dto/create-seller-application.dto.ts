import { IsOptional, IsString, MaxLength, Matches } from 'class-validator';

export class CreateSellerApplicationDto {
  @IsString()
  @MaxLength(120)
  displayName: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  logoUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  @Matches(/^[a-z0-9-]+$/i, {
    message: 'slug sadece harf, rakam ve tire icerebilir',
  })
  slug?: string;
}
