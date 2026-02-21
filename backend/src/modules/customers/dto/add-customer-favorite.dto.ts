import { IsInt, Min } from 'class-validator';

export class AddCustomerFavoriteDto {
  @IsInt()
  @Min(1)
  productId: number;
}
