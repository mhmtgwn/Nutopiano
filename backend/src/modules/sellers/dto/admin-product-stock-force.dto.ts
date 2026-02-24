import {
  IsInt,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class AdminProductStockForceDto {
  @IsInt()
  @Min(0)
  stock: number;

  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason: string;
}
