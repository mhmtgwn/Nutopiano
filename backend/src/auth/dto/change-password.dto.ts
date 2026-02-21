import { IsNotEmpty, IsString, MinLength, Matches } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(12, { message: 'Şifre en az 12 karakter olmalı' })
  @Matches(/[A-Z]/, { message: 'Büyük harf (A-Z) gerekli' })
  @Matches(/[a-z]/, { message: 'Küçük harf (a-z) gerekli' })
  @Matches(/[0-9]/, { message: 'Rakam (0-9) gerekli' })
  @Matches(/[!"#$%&'()*+,./:;<=>?@[\\\]^_`{|}~-]/, {
    message: 'Özel karakter (!@#$%^&* vb.) gerekli',
  })
  newPassword: string;
}
