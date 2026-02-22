import { IsOptional, IsString, MaxLength, Matches } from 'class-validator';

export class CreateReturnRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Matches(/^[^<>]*$/, { message: 'HTML tag kullanılamaz' })
  reason?: string;
}
