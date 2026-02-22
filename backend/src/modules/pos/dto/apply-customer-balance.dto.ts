import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Min } from 'class-validator';

export class ApplyCustomerBalanceDto {
  @ApiPropertyOptional({
    description:
      'Uygulanacak bakiye (kurus). Bos birakilirsa sistem otomatik uygun tutari kullanir.',
    example: 5000,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  amountCents?: number;
}

